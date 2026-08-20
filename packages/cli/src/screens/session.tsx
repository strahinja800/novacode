import { type ModeType, type SupportedChatModelId } from '@novacode/shared'
import { useKeyboard } from '@opentui/react'
import type { InferResponseType } from 'hono/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { BotMessage, ErrorMessage, UserMessage } from '@/components/messages'
import { SessionShell } from '@/components/session-shell'
import type { Message } from '@/hooks/use-chat'
import { useChat } from '@/hooks/use-chat'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/http-errors'
import { useKeyboardLayer } from '@/providers/keyboard-layer'
import { usePromptConfig } from '@/providers/prompt-config'
import { useToast } from '@/providers/toast'

type SessionData = InferResponseType<
  (typeof apiClient.sessions)[':id']['$get'],
  200
>

type InitialPrompt = {
  message: string
  mode: ModeType
  model: SupportedChatModelId
}

function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    const text = message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('')

    return (
      <UserMessage
        message={text}
        mode={message.metadata?.mode}
      />
    )
  }

  return (
    <BotMessage
      parts={message.parts}
      model={message.metadata?.model ?? 'unknown'}
      mode={message.metadata?.mode}
      durationMs={message.metadata?.durationMs}
    />
  )
}

type SessionChatProps = {
  session: SessionData
  initialPrompt?: InitialPrompt
}

function SessionChat({ session, initialPrompt }: SessionChatProps) {
  const { isTopLayer } = useKeyboardLayer()
  const { mode, model } = usePromptConfig()
  const hasSubmittedInitialPromptRef = useRef(false)

  const initialMessages = useMemo(
    () => (session.messages ?? []) as unknown as Message[],
    [session.messages],
  )

  const { messages, status, error, submit, abort, interrupt } = useChat({
    sessionId: session.id,
    initialMessages,
  })

  useEffect(() => {
    return () => {
      void abort()
    }
  }, [abort])

  useEffect(() => {
    if (!initialPrompt || hasSubmittedInitialPromptRef.current) return

    hasSubmittedInitialPromptRef.current = true

    void submit({
      userText: initialPrompt.message,
      mode: initialPrompt.mode,
      model: initialPrompt.model,
    })
  }, [initialPrompt, submit])

  const handleSubmit = useCallback(
    (userText: string) => {
      void submit({ userText, mode, model })
    },
    [submit, mode, model],
  )

  useKeyboard(key => {
    if (key.name !== 'escape') return
    if (!isTopLayer('base')) return
    if (status !== 'streaming') return

    void interrupt()
  })

  const isBusy = status === 'streaming' || status === 'submitted'

  return (
    <SessionShell
      onSubmit={handleSubmit}
      loading={isBusy}
      interruptible={status === 'streaming'}
    >
      {messages.map(message => (
        <ChatMessage
          key={message.id}
          message={message}
        />
      ))}

      {error ? <ErrorMessage message={error.message} /> : null}
    </SessionShell>
  )
}

export function Session() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const prefetched = useMemo(() => {
    const state = location.state as {
      session?: SessionData
      initialPrompt?: InitialPrompt
    } | null

    return state ?? null
  }, [location.state])

  const [session, setSession] = useState<SessionData | null>(
    prefetched?.session ?? null,
  )
  const [loading, setLoading] = useState(!prefetched?.session)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || prefetched?.session) return

    let ignore = false

    const fetchSession = async () => {
      try {
        const response = await apiClient.sessions[':id'].$get({
          param: { id },
        })

        if (ignore) return

        if (!response.ok) {
          throw new Error(await getErrorMessage(response))
        }

        const data = await response.json()

        if (ignore) return

        setSession(data)
      } catch (caught) {
        if (ignore) return

        const message =
          caught instanceof Error ? caught.message : 'Failed to load session'

        setError(message)
        toast.show({ variant: 'error', message })
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void fetchSession()

    return () => {
      ignore = true
    }
  }, [id, prefetched, toast])

  useEffect(() => {
    if (!id) navigate('/', { replace: true })
  }, [id, navigate])

  if (!id) return null

  if (!session) {
    return (
      <SessionShell
        onSubmit={() => {}}
        inputDisabled
        loading={loading}
      >
        {error ? <ErrorMessage message={error} /> : null}
      </SessionShell>
    )
  }

  return (
    <SessionChat
      key={session.id}
      session={session}
      initialPrompt={prefetched?.initialPrompt}
    />
  )
}
