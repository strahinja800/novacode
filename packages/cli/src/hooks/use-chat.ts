import { useChat as useAIChat } from '@ai-sdk/react'
import type { NovaCodeUIMessage } from '@novacode/server'
import type { SupportedChatModelId } from '@novacode/shared'
import { Mode, type ModeType, type ToolName } from '@novacode/shared'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import { useCallback, useMemo, useRef } from 'react'

import { apiClient } from '@/lib/api-client'
import { getAuth } from '@/lib/auth'
import { executeLocalTool } from '@/lib/local-tools'

export type Message = NovaCodeUIMessage

type SubmitParams = {
  userText: string
  mode: ModeType
  model: SupportedChatModelId
}

type UseChatParams = {
  sessionId: string
  initialMessages: Message[]
}

export function useChat({ sessionId, initialMessages }: UseChatParams) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport<Message>({
        api: apiClient.chat.$url().toString(),
        headers: (): Record<string, string> => {
          const auth = getAuth()

          return auth ? { authorization: `Bearer ${auth.token}` } : {}
        },
        prepareSendMessagesRequest: ({ messages, body }) => {
          const lastMessage = messages.at(-1)

          if (!lastMessage) throw new Error('No message to send')

          const metadata = lastMessage.metadata
          const previousMessage = messages.at(-2)

          const requestMessages =
            lastMessage.role === 'assistant' && previousMessage?.role === 'user'
              ? [previousMessage, lastMessage]
              : [lastMessage]

          return {
            body: {
              id: sessionId,
              messages: requestMessages,
              mode: metadata?.mode ?? body?.mode ?? Mode.BUILD,
              model: metadata?.model ?? body?.model,
            },
          }
        },
      }),
    [sessionId],
  )

  const chat = useAIChat<Message>({
    id: sessionId,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const mode =
        chat.messages.at(-1)?.metadata?.mode ??
        initialMessages.at(-1)?.metadata?.mode ??
        Mode.BUILD

      void executeLocalTool({
        toolName: toolCall.toolName,
        input: toolCall.input,
        mode,
      })
        .then(output => {
          void chat.addToolOutput({
            tool: toolCall.toolName as ToolName,
            toolCallId: toolCall.toolCallId,
            output,
          })
        })
        .catch((caught: unknown) => {
          void chat.addToolOutput({
            tool: toolCall.toolName as ToolName,
            toolCallId: toolCall.toolCallId,
            output: `Error: ${caught instanceof Error ? caught.message : String(caught)}`,
          })
        })
    },
  })

  const chatRef = useRef(chat)
  chatRef.current = chat

  const submit = useCallback(({ userText, mode, model }: SubmitParams) => {
    return chatRef.current.sendMessage(
      {
        text: userText,
        metadata: { mode, model },
      },
      { body: { mode, model } },
    )
  }, [])

  const abort = useCallback(() => chatRef.current.stop(), [])

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    submit,
    abort,
    interrupt: abort,
  }
}
