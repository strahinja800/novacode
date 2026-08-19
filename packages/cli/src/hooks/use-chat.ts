import type { Mode } from '@novacode/database/enums'
import {
  type ChatStreamEvent,
  chatStreamEventSchema,
  type ToolCallArguments,
} from '@novacode/shared'
import { EventSourceParserStream } from 'eventsource-parser/stream'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useRef, useState } from 'react'

import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/http-errors'

/**
 * A tool call as the terminal shows it.
 *
 * `status` is the one field the server has no use for: it persists `result`
 * once the tool returns, but the visitor needs to see that something is running
 * while it does.
 */
export type ClientToolCallPart = {
  type: 'tool-call'
  id: string
  name: string
  arguments: ToolCallArguments
  result?: string
  status: 'calling' | 'done'
}

/** One rendered piece of an assistant reply. */
export type ClientMessagePart =
  | { type: 'reasoning'; text: string }
  | ClientToolCallPart
  | { type: 'text'; text: string }

/**
 * A message as the screen needs it, which is not how the database stores it.
 *
 * Discriminated by `role`, so the renderer cannot reach for `duration` on an
 * error or `parts` on something the visitor typed.
 */
export type Message =
  | {
      id: string
      role: 'user'
      content: string
      mode: Mode
      model: string
    }
  | {
      id: string
      role: 'assistant'
      content: string
      parts: ClientMessagePart[]
      mode: Mode
      model: string
      /** Already humanized, e.g. `4.2s`. */
      duration?: string
      interrupted?: boolean
    }
  | {
      id: string
      role: 'error'
      content: string
    }

type StreamingState =
  | { status: 'idle' }
  | {
      status: 'streaming'
      parts: ClientMessagePart[]
      mode: Mode
      model: string
    }

type ActiveStream = {
  requestId: string
  controller: AbortController
  mode: Mode
  model: string
  parts: ClientMessagePart[]
  interruptedCaptured: boolean
}

/**
 * The little this hook needs from a response.
 *
 * Structural rather than Hono's `ClientResponse`, because the submit and resume
 * routes have different response types and neither of them matters here — what
 * matters is a body to read and enough to build an error message from.
 */
type StreamResponse = {
  ok: boolean
  body: ReadableStream | null
  json: () => Promise<unknown>
  status: number
  statusText: string
}

type SubmitParams = {
  userText: string
  mode: Mode
  model: string
}

type RunStreamParams = {
  mode: Mode
  model: string
  request: (controller: AbortController) => Promise<StreamResponse>
}

type UseChatParams = {
  sessionId: string
  initialMessages: Message[]
}

/** Ids for messages that exist only on this client until the server confirms. */
function createLocalId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function partsToText(parts: ClientMessagePart[]): string {
  return parts
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('')
}

/**
 * Server-sent chat streaming, with optimistic updates and interruption.
 *
 * This is a hand-rolled stand-in for the AI SDK's `useChat`, which reaches for
 * browser APIs OpenTUI does not provide.
 */
export function useChat({ sessionId, initialMessages }: UseChatParams) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [streaming, setStreaming] = useState<StreamingState>({ status: 'idle' })

  const activeStreamRef = useRef<ActiveStream | null>(null)

  /**
   * Guards every state write against a stream the visitor has already left
   * behind. Without it, a slow reply to an interrupted request would keep
   * painting text after the next one started.
   */
  const isActiveRequest = useCallback((requestId: string) => {
    return activeStreamRef.current?.requestId === requestId
  }, [])

  const appendErrorMessage = useCallback((content: string) => {
    setMessages(previous => [
      ...previous,
      { id: createLocalId('error'), role: 'error', content },
    ])
  }, [])

  const emitParts = useCallback(
    (requestId: string, parts: ClientMessagePart[]) => {
      const activeStream = activeStreamRef.current

      if (!isActiveRequest(requestId) || !activeStream) return

      activeStream.parts = parts

      // Copied on the way into state: `parts` is mutated in place as deltas
      // arrive, and React would not see an in-place change as a new render.
      setStreaming({
        status: 'streaming',
        parts: [...parts],
        mode: activeStream.mode,
        model: activeStream.model,
      })
    },
    [isActiveRequest],
  )

  const clearStream = useCallback(
    (requestId: string) => {
      if (!isActiveRequest(requestId)) return

      activeStreamRef.current = null
      setStreaming({ status: 'idle' })
    },
    [isActiveRequest],
  )

  /**
   * Keep whatever the model managed to say before being cut off.
   *
   * The server persists the same partial reply on its side; this puts it on
   * screen immediately instead of waiting for a refetch.
   */
  const captureInterruptedMessage = useCallback((activeStream: ActiveStream) => {
    if (activeStream.interruptedCaptured || activeStream.parts.length === 0) {
      return
    }

    activeStream.interruptedCaptured = true

    const parts = [...activeStream.parts]

    setMessages(previous => [
      ...previous,
      {
        id: createLocalId('interrupted'),
        role: 'assistant',
        content: partsToText(parts),
        parts,
        mode: activeStream.mode,
        model: activeStream.model,
        interrupted: true,
      },
    ])
  }, [])

  /** The one way a stream ends early, whether by escape or by a new message. */
  const stopActiveStream = useCallback(
    (capturePartial: boolean) => {
      const activeStream = activeStreamRef.current

      if (!activeStream) return

      if (capturePartial) captureInterruptedMessage(activeStream)

      activeStreamRef.current = null
      setStreaming({ status: 'idle' })
      activeStream.controller.abort()
    },
    [captureInterruptedMessage],
  )

  const handleStream = useCallback(
    async (response: StreamResponse, activeStream: ActiveStream) => {
      if (!isActiveRequest(activeStream.requestId)) return

      if (!response.ok || !response.body) {
        appendErrorMessage(await getErrorMessage(response))
        return
      }

      const parts: ClientMessagePart[] = []

      const events = response.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream())

      for await (const { data } of events) {
        if (!isActiveRequest(activeStream.requestId)) return

        let event: ChatStreamEvent

        try {
          event = chatStreamEventSchema.parse(JSON.parse(data))
        } catch (caught) {
          appendErrorMessage(
            caught instanceof Error
              ? caught.message
              : 'Received an unreadable event from the server',
          )
          break
        }

        // Appended into the previous part rather than pushed as a new one: a
        // part per delta would be a part per few characters.
        if (event.type === 'text-delta') {
          const lastPart = parts.at(-1)

          if (lastPart?.type === 'text') lastPart.text += event.text
          else parts.push({ type: 'text', text: event.text })

          emitParts(activeStream.requestId, parts)
          continue
        }

        if (event.type === 'reasoning-delta') {
          const lastPart = parts.at(-1)

          if (lastPart?.type === 'reasoning') lastPart.text += event.text
          else parts.push({ type: 'reasoning', text: event.text })

          emitParts(activeStream.requestId, parts)
          continue
        }

        if (event.type === 'tool-call') {
          parts.push({
            type: 'tool-call',
            id: event.toolCallId,
            name: event.toolName,
            arguments: event.arguments,
            status: 'calling',
          })

          emitParts(activeStream.requestId, parts)
          continue
        }

        if (event.type === 'tool-result') {
          const toolCallPart = parts.find(
            part => part.type === 'tool-call' && part.id === event.toolCallId,
          )

          if (toolCallPart?.type === 'tool-call') {
            toolCallPart.result = event.result
            toolCallPart.status = 'done'
          }

          emitParts(activeStream.requestId, parts)
          continue
        }

        if (event.type === 'done') {
          setMessages(previous => [
            ...previous,
            {
              id: event.messageId,
              role: 'assistant',
              content: partsToText(parts),
              parts: [...parts],
              mode: activeStream.mode,
              model: activeStream.model,
              duration: prettyMilliseconds(event.durationMs),
            },
          ])

          // Batched with the append above, so the settled message never renders
          // alongside the live one it replaces.
          clearStream(activeStream.requestId)
          break
        }

        if (event.type === 'error') {
          appendErrorMessage(event.message)
          break
        }
      }
    },
    [isActiveRequest, appendErrorMessage, emitParts, clearStream],
  )

  const runStream = useCallback(
    async ({ mode, model, request }: RunStreamParams) => {
      const controller = new AbortController()

      const activeStream: ActiveStream = {
        requestId: createLocalId('request'),
        controller,
        mode,
        model,
        parts: [],
        interruptedCaptured: false,
      }

      activeStreamRef.current = activeStream
      setStreaming({ status: 'streaming', parts: [], mode, model })

      try {
        await handleStream(await request(controller), activeStream)
      } catch (caught) {
        // The visitor aborted this themselves; they do not need to be told.
        if (caught instanceof Error && caught.name === 'AbortError') return
        if (!isActiveRequest(activeStream.requestId)) return

        appendErrorMessage(
          caught instanceof Error
            ? caught.message
            : 'Failed to reach the server',
        )
      } finally {
        clearStream(activeStream.requestId)
      }
    },
    [handleStream, isActiveRequest, appendErrorMessage, clearStream],
  )

  const resume = useCallback(
    async ({ mode, model }: Omit<SubmitParams, 'userText'>) => {
      await runStream({
        mode,
        model,
        request: controller =>
          apiClient.chat[':sessionId'].resume.$post(
            { param: { sessionId } },
            { init: { signal: controller.signal } },
          ),
      })
    },
    [runStream, sessionId],
  )

  const hasAutoResumedRef = useRef(false)

  /**
   * Answer a message that arrived without a reply.
   *
   * This is the normal opening of every session, not a recovery case: the
   * new-session screen creates the session together with the first message and
   * navigates here, so there is always exactly one turn owed on arrival.
   */
  useEffect(() => {
    if (hasAutoResumedRef.current) return

    const lastMessage = initialMessages.at(-1)

    if (!lastMessage || lastMessage.role !== 'user') return

    hasAutoResumedRef.current = true

    void resume({ mode: lastMessage.mode, model: lastMessage.model })
  }, [initialMessages, resume])

  const submit = useCallback(
    async ({ userText, mode, model }: SubmitParams) => {
      // Sending while a reply is in flight keeps what has been said so far.
      stopActiveStream(true)

      setMessages(previous => [
        ...previous,
        {
          id: createLocalId('user'),
          role: 'user',
          content: userText,
          mode,
          model,
        },
      ])

      await runStream({
        mode,
        model,
        request: controller =>
          apiClient.chat[':sessionId'].$post(
            {
              param: { sessionId },
              json: { content: userText, mode, model },
            },
            { init: { signal: controller.signal } },
          ),
      })
    },
    [runStream, sessionId, stopActiveStream],
  )

  /** Leaving the session: drop the reply on the floor. */
  const abort = useCallback(() => stopActiveStream(false), [stopActiveStream])

  /** Escape: stop, but keep what was written. */
  const interrupt = useCallback(() => stopActiveStream(true), [stopActiveStream])

  return { messages, streaming, submit, abort, interrupt }
}
