import { zValidator } from '@hono/zod-validator'
import type { Prisma } from '@novacode/database'
import { database } from '@novacode/database/client'
import { MessageStatus, Mode, Role } from '@novacode/database/enums'
import {
  type ChatStreamEvent,
  type MessagePart,
  messagePartsSchema,
  toolCallArgumentsSchema,
} from '@novacode/shared'
import { stepCountIs, streamText } from 'ai'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { type SSEStreamingApi, streamSSE } from 'hono/streaming'
import { z } from 'zod'

import { isSupportedChatModel, resolveChatModel } from '../lib/models'
import type { AuthenticatedEnv } from '../middleware/require-auth'
import { buildSystemPrompt } from '../system-prompt'
import { createTools } from '../tools'

/**
 * How many model turns one request may take.
 *
 * Each tool call costs a step, so a real task — glob, read a few files, edit,
 * run the tests — burns through the SDK's default of 20 quickly. Fifty is a
 * ceiling against a loop, not a budget the model is meant to spend.
 */
const MAX_STEPS = 50

const submitSchema = z.object({
  content: z.string().min(1),
  mode: z.enum(Mode),
  model: z.string().refine(isSupportedChatModel, {
    message: 'Unsupported model',
  }),
})

const submitValidator = zValidator('json', submitSchema, (result, _c) => {
  if (!result.success) {
    throw new HTTPException(400, {
      message: result.error.issues.map(issue => issue.message).join(', '),
    })
  }
})

/**
 * Sessions with a resume already in flight.
 *
 * The client's auto-resume runs from an effect, and effects fire twice in
 * development. Without this, one unanswered message would be answered twice and
 * both replies would be persisted. In-memory is enough while there is one
 * server process; a second one needs this in the database.
 */
const activeResumeSessionIds = new Set<string>()

type HistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Turn stored messages into what the model should actually see.
 *
 * Errors never happened as far as the conversation is concerned, and an empty
 * assistant turn is a stream that died before its first token — sending either
 * spends tokens on noise. Interrupted replies stay: a partial answer is still
 * something the model said.
 */
function buildConversationHistory({
  messages,
}: {
  messages: { role: Role; content: string }[]
}): HistoryMessage[] {
  return messages.flatMap(message => {
    if (message.role === Role.ERROR) return []
    if (message.role === Role.ASSISTANT && message.content.length === 0) {
      return []
    }

    return [
      {
        role:
          message.role === Role.USER ? ('user' as const) : ('assistant' as const),
        content: message.content,
      },
    ]
  })
}

/**
 * The last message, but only if it is a question still waiting on an answer.
 *
 * Generic so the caller keeps its own row type — resume needs `model` and
 * `mode` off the result, which a widened return type would throw away.
 */
function getResumableUserMessage<T extends { role: Role }>(
  messages: T[],
): T | null {
  const lastMessage = messages.at(-1)

  if (!lastMessage || lastMessage.role !== Role.USER) return null

  return lastMessage
}

type StreamParams = {
  sessionId: string
  model: string
  history: HistoryMessage[]
  mode: Mode
  /** The directory the session was started in. Tools are scoped to it. */
  cwd: string | null
  abortController: AbortController
}

/** The prose half of a reply, which is what later turns are given as context. */
function partsToText(parts: MessagePart[]): string {
  return parts
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('')
}

/**
 * Check the parts against the shared schema on the way into the database.
 *
 * `Message.parts` is a `Json` column, so Postgres will accept anything. The
 * schema is what makes the column trustworthy enough for the CLI to render
 * without defensive checks at every level.
 */
function toStoredParts(parts: MessagePart[]): Prisma.InputJsonValue | undefined {
  if (parts.length === 0) return undefined

  return messagePartsSchema.parse(parts) as Prisma.InputJsonValue
}

/**
 * Run one model turn: stream it out over SSE and persist how it ended.
 *
 * Every exit path writes a row — complete, interrupted, or error — so the
 * session screen after a reload always agrees with what the visitor saw.
 * Shared by the submit and resume routes, which differ only in where the
 * history comes from.
 */
async function streamAIResponse(stream: SSEStreamingApi, params: StreamParams) {
  const { sessionId, model, history, mode, cwd, abortController } = params

  const startedAt = Date.now()
  const { model: languageModel, providerOptions } = resolveChatModel(model)

  // Ordered rather than a flat string: a turn interleaves thinking, tool calls
  // and prose, and the terminal draws each of them differently.
  const parts: MessagePart[] = []
  let hasPersistedInterruption = false

  const isAborted = () => stream.aborted || abortController.signal.aborted

  const persistInterruptedMessage = async () => {
    // Nothing had been produced before the visitor hit escape. The guard also
    // makes this safe to call from both the loop's exit and the catch block.
    if (parts.length === 0 || hasPersistedInterruption) return

    hasPersistedInterruption = true

    await database.message.create({
      data: {
        sessionId,
        role: Role.ASSISTANT,
        status: MessageStatus.INTERRUPTED,
        model,
        content: partsToText(parts),
        parts: toStoredParts(parts),
        mode,
        duration: Date.now() - startedAt,
      },
    })
  }

  const emit = async (event: ChatStreamEvent) => {
    await stream.writeSSE({ event: event.type, data: JSON.stringify(event) })
  }

  const tools = cwd ? createTools({ cwd, mode }) : undefined

  try {
    const result = streamText({
      model: languageModel,
      system: buildSystemPrompt({ cwd, mode }),
      messages: history,
      providerOptions,
      tools,
      // Without this the turn stops after the first tool result, before the
      // model has had a chance to say anything about what it found.
      stopWhen: tools ? stepCountIs(MAX_STEPS) : undefined,
      abortSignal: abortController.signal,
    })

    for await (const streamPart of result.fullStream) {
      if (isAborted()) break

      // Deltas are merged into the part they continue rather than pushed as
      // new ones. A part per delta would mean thousands of them per message,
      // and a "Thinking" heading above every few characters.
      if (streamPart.type === 'text-delta') {
        const lastPart = parts.at(-1)

        if (lastPart?.type === 'text') lastPart.text += streamPart.text
        else parts.push({ type: 'text', text: streamPart.text })

        await emit({ type: 'text-delta', text: streamPart.text })
        continue
      }

      if (streamPart.type === 'reasoning-delta') {
        const lastPart = parts.at(-1)

        if (lastPart?.type === 'reasoning') lastPart.text += streamPart.text
        else parts.push({ type: 'reasoning', text: streamPart.text })

        await emit({ type: 'reasoning-delta', text: streamPart.text })
        continue
      }

      if (streamPart.type === 'tool-call') {
        // The model chose these arguments, so they are only as well-formed as
        // it decided to make them.
        const args = toolCallArgumentsSchema.safeParse(streamPart.input)
        const toolArguments = args.success ? args.data : {}

        parts.push({
          type: 'tool-call',
          id: streamPart.toolCallId,
          name: streamPart.toolName,
          arguments: toolArguments,
        })

        await emit({
          type: 'tool-call',
          toolCallId: streamPart.toolCallId,
          toolName: streamPart.toolName,
          arguments: toolArguments,
        })
        continue
      }

      if (streamPart.type === 'tool-result') {
        const result =
          typeof streamPart.output === 'string'
            ? streamPart.output
            : JSON.stringify(streamPart.output)

        const toolCallPart = parts.find(
          candidate =>
            candidate.type === 'tool-call' &&
            candidate.id === streamPart.toolCallId,
        )

        if (toolCallPart?.type === 'tool-call') toolCallPart.result = result

        await emit({
          type: 'tool-result',
          toolCallId: streamPart.toolCallId,
          result,
        })
        continue
      }

      if (streamPart.type === 'error') {
        throw streamPart.error instanceof Error
          ? streamPart.error
          : new Error(String(streamPart.error))
      }
    }

    if (isAborted()) {
      await persistInterruptedMessage()
      return
    }

    const durationMs = Date.now() - startedAt

    const message = await database.message.create({
      data: {
        sessionId,
        role: Role.ASSISTANT,
        status: MessageStatus.COMPLETE,
        model,
        content: partsToText(parts),
        parts: toStoredParts(parts),
        mode,
        duration: durationMs,
      },
    })

    await emit({ type: 'done', messageId: message.id, durationMs })
  } catch (caught) {
    // An abort surfaces here as a thrown `AbortError` rather than a clean loop
    // exit, and that is not a failure worth showing anyone.
    if (isAborted()) {
      await persistInterruptedMessage()
      return
    }

    const message =
      caught instanceof Error ? caught.message : 'Failed to generate a reply'

    await database.message.create({
      data: {
        sessionId,
        role: Role.ERROR,
        status: MessageStatus.COMPLETE,
        model,
        content: message,
        mode,
      },
    })

    await emit({ type: 'error', message })
  }
}

/**
 * Last-resort reporter for anything thrown outside `streamAIResponse`.
 *
 * That function persists its own failures; this one only makes sure the client
 * hears about a failure it cannot otherwise see, such as the database being
 * unreachable while loading the session.
 */
async function reportStreamError(error: Error, stream: SSEStreamingApi) {
  const event: ChatStreamEvent = {
    type: 'error',
    message: error.message || 'Something went wrong',
  }

  await stream.writeSSE({ event: event.type, data: JSON.stringify(event) })
}

async function loadSessionWithMessages(sessionId: string, userId: string) {
  const session = await database.session.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!session) {
    throw new HTTPException(404, { message: 'Session not found' })
  }

  return session
}

const app = new Hono<AuthenticatedEnv>()
  /**
   * Answer a message that was stored but never replied to.
   *
   * This is not a rare recovery path: the new-session screen creates the
   * session together with the visitor's first message, so the very first reply
   * of every session arrives through here.
   */
  .post('/:sessionId/resume', async c => {
    const sessionId = c.req.param('sessionId')
    const session = await loadSessionWithMessages(sessionId, c.get('userId'))

    const resumableMessage = getResumableUserMessage(session.messages)

    if (!resumableMessage) {
      throw new HTTPException(400, { message: 'Nothing to resume' })
    }

    // A session started a year ago may name a model we have since dropped.
    if (!isSupportedChatModel(resumableMessage.model)) {
      throw new HTTPException(400, {
        message: 'This session uses an unsupported model',
      })
    }

    if (activeResumeSessionIds.has(sessionId)) {
      throw new HTTPException(409, {
        message: 'Session already has an active resume',
      })
    }

    activeResumeSessionIds.add(sessionId)

    const history = buildConversationHistory({ messages: session.messages })
    const abortController = new AbortController()

    return streamSSE(
      c,
      async stream => {
        stream.onAbort(() => abortController.abort())

        try {
          await streamAIResponse(stream, {
            sessionId,
            model: resumableMessage.model,
            history,
            mode: resumableMessage.mode,
            cwd: session.path,
            abortController,
          })
        } finally {
          activeResumeSessionIds.delete(sessionId)
        }
      },
      async (error, stream) => {
        activeResumeSessionIds.delete(sessionId)
        await reportStreamError(error, stream)
      },
    )
  })
  .post('/:sessionId', submitValidator, async c => {
    const sessionId = c.req.param('sessionId')
    const session = await loadSessionWithMessages(sessionId, c.get('userId'))

    const data = c.req.valid('json')

    // Stored before streaming starts, so an interrupted or failed reply still
    // leaves the visitor's own message in the history.
    const userMessage = await database.message.create({
      data: {
        sessionId,
        role: Role.USER,
        status: MessageStatus.COMPLETE,
        model: data.model,
        content: data.content,
        mode: data.mode,
      },
    })

    const history = buildConversationHistory({
      messages: [...session.messages, userMessage],
    })

    const abortController = new AbortController()

    return streamSSE(
      c,
      async stream => {
        stream.onAbort(() => abortController.abort())

        await streamAIResponse(stream, {
          sessionId,
          model: data.model,
          history,
          mode: data.mode,
          cwd: session.path,
          abortController,
        })
      },
      reportStreamError,
    )
  })

export default app
