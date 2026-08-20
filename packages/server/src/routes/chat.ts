import { zValidator } from '@hono/zod-validator'
import type { Prisma } from '@novacode/database'
import { database } from '@novacode/database/client'
import {
  getToolContracts,
  modeSchema,
  type ModeType,
  type ToolContracts,
} from '@novacode/shared'
import {
  convertToModelMessages,
  type InferUITools,
  type LanguageModelUsage,
  stepCountIs,
  streamText,
  type UIMessage,
  validateUIMessages,
} from 'ai'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

import { calculateCreditsForUsage } from '../lib/credits'
import { isSupportedChatModel, resolveChatModel } from '../lib/models'
import { ingestAIUsage } from '../lib/polar'
import type { AuthenticatedEnv } from '../middleware/require-auth'
import { requireCreditsBalance } from '../middleware/require-credits-balance'
import { buildSystemPrompt } from '../system-prompt'

const MAX_STEPS = 50

type ChatMessageMetadata = {
  mode?: ModeType
  model?: string
  durationMs?: number
  usage?: LanguageModelUsage
}

export type ChatTools = InferUITools<ToolContracts>

export type NovaCodeUIMessage = UIMessage<
  ChatMessageMetadata,
  never,
  ChatTools
>

const submitSchema = z.object({
  id: z.string().min(1),
  messages: z.array(z.custom<NovaCodeUIMessage>()).min(1),
  mode: modeSchema,
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

function hasPendingToolCalls(message: NovaCodeUIMessage | undefined): boolean {
  if (!message) return false

  return message.parts.some(part => {
    if (part.type === 'dynamic-tool') return part.state !== 'output-available'
    if (!part.type.startsWith('tool-')) return false

    const state = (part as { state?: string }).state

    return state !== 'output-available' && state !== 'output-error'
  })
}

const app = new Hono<AuthenticatedEnv>().post(
  '/',
  requireCreditsBalance,
  submitValidator,
  async c => {
    const userId = c.get('userId')
    const { id, messages, mode, model } = c.req.valid('json')

    const session = await database.session.findFirst({
      where: { id, userId },
    })

    if (!session) {
      throw new HTTPException(404, { message: 'Session not found' })
    }

    const startedAt = Date.now()
    const tools = getToolContracts(mode)
    const resolved = resolveChatModel(model)

    const previousMessages = (session.messages ??
      []) as unknown as NovaCodeUIMessage[]
    const mergedMessages = [...previousMessages]

    for (const incoming of messages) {
      const existingIndex = mergedMessages.findIndex(
        candidate => candidate.id === incoming.id,
      )

      if (existingIndex === -1) mergedMessages.push(incoming)
      else mergedMessages[existingIndex] = incoming
    }

    const nextMessages = await validateUIMessages<NovaCodeUIMessage>({
      messages: mergedMessages,
      tools: tools as Parameters<
        typeof validateUIMessages<NovaCodeUIMessage>
      >[0]['tools'],
    })

    let completedUsage: LanguageModelUsage | null = null

    const result = streamText({
      model: resolved.model,
      system: buildSystemPrompt({ mode }),
      messages: await convertToModelMessages(nextMessages),
      tools,
      stopWhen: stepCountIs(MAX_STEPS),
      providerOptions: resolved.providerOptions,
      onFinish: event => {
        completedUsage = event.totalUsage
      },
    })

    return result.toUIMessageStreamResponse<NovaCodeUIMessage>({
      originalMessages: nextMessages,
      messageMetadata: ({ part }) => {
        if (part.type === 'start') return { mode, model }
        if (part.type !== 'finish') return undefined

        return {
          mode,
          model,
          durationMs: Date.now() - startedAt,
          ...(completedUsage ? { usage: completedUsage } : {}),
        }
      },
      onFinish: async ({ messages: finalMessages, responseMessage }) => {
        if (hasPendingToolCalls(responseMessage)) return

        await database.session.update({
          where: { id },
          data: { messages: finalMessages as unknown as Prisma.InputJsonValue },
        })

        if (!completedUsage) return

        try {
          const billable = calculateCreditsForUsage({
            provider: resolved.provider,
            model,
            usage: completedUsage,
          })

          await ingestAIUsage({
            externalCustomerId: userId,
            eventId: responseMessage.id,
            credits: billable.credits,
          })
        } catch (caught) {
          console.error('Failed to report usage to Polar:', caught)
        }
      },
      onError: error => (error instanceof Error ? error.message : String(error)),
    })
  },
)

export default app
