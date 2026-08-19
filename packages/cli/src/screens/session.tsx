import { MessageStatus, Role } from '@novacode/database/enums'
import { messagePartsSchema } from '@novacode/shared'
import { useKeyboard } from '@opentui/react'
import type { InferResponseType } from 'hono/client'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { BotMessage, ErrorMessage, UserMessage } from '@/components/messages'
import { SessionShell } from '@/components/session-shell'
import type { ClientMessagePart, Message } from '@/hooks/use-chat'
import { useChat } from '@/hooks/use-chat'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/http-errors'
import { useKeyboardLayer } from '@/providers/keyboard-layer'
import { usePromptConfig } from '@/providers/prompt-config'
import { useToast } from '@/providers/toast'

/**
 * Derived from the route itself, so a change to the server's response shape
 * shows up here as a type error rather than as a runtime surprise.
 */
type SessionData = InferResponseType<
  (typeof apiClient.sessions)[':id']['$get'],
  200
>

/**
 * Translate stored rows into what the chat hook and renderer expect.
 *
 * The database keeps a message as one content string with a status; the screen
 * wants parts to render, a humanized duration, and a plain `interrupted` flag.
 */
/**
 * Read back what the server stored in the `Json` column.
 *
 * Parsed rather than cast: the column predates the schema and could hold rows
 * written before a part type existed. A row that fails becomes plain text,
 * which is worse than the real thing but not a crash.
 */
function toClientParts(
  storedParts: unknown,
  content: string,
): ClientMessagePart[] {
  const parsed = messagePartsSchema.safeParse(storedParts)

  if (!parsed.success) return [{ type: 'text', text: content }]

  return parsed.data.map(part =>
    part.type === 'tool-call'
      ? { ...part, status: 'done' as const }
      : part,
  )
}

function mapDatabaseMessages(messages: SessionData['messages']): Message[] {
  return messages.map(message => {
    if (message.role === Role.ERROR) {
      return {
        id: message.id,
        role: 'error',
        content: message.content,
      }
    }

    if (message.role === Role.USER) {
      return {
        id: message.id,
        role: 'user',
        content: message.content,
        mode: message.mode,
        model: message.model,
      }
    }

    return {
      id: message.id,
      role: 'assistant',
      content: message.content,
      parts: toClientParts(message.parts, message.content),
      mode: message.mode,
      model: message.model,
      interrupted: message.status === MessageStatus.INTERRUPTED,
      ...(message.duration !== null && {
        duration: prettyMilliseconds(message.duration),
      }),
    }
  })
}

function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <UserMessage
        message={message.content}
        mode={message.mode}
      />
    )
  }

  if (message.role === 'error') {
    return <ErrorMessage message={message.content} />
  }

  return (
    <BotMessage
      parts={message.parts}
      model={message.model}
      mode={message.mode}
      duration={message.duration}
      interrupted={message.interrupted}
    />
  )
}

/**
 * The session once its data is in hand.
 *
 * Split out from `Session` so the chat hook mounts with the real initial
 * messages instead of an empty list it would have to reconcile later.
 */
function SessionChat({ session }: { session: SessionData }) {
  const { isTopLayer } = useKeyboardLayer()
  const { mode, model } = usePromptConfig()

  const initialMessages = useMemo(
    () => mapDatabaseMessages(session.messages),
    [session.messages],
  )

  const { messages, streaming, submit, abort, interrupt } = useChat({
    sessionId: session.id,
    initialMessages,
  })

  // Leaving the session should not leave a reply streaming into nothing.
  useEffect(() => abort, [abort])

  const handleSubmit = useCallback(
    (userText: string) => {
      void submit({ userText, mode, model })
    },
    [submit, mode, model],
  )

  // Only at the base layer: with a dialog open, escape belongs to the dialog.
  useKeyboard(key => {
    if (key.name !== 'escape') return
    if (!isTopLayer('base')) return
    if (streaming.status !== 'streaming') return

    interrupt()
  })

  const isStreaming = streaming.status === 'streaming'

  return (
    <SessionShell
      onSubmit={handleSubmit}
      loading={isStreaming}
      interruptible={isStreaming}
    >
      {messages.map(message => (
        <ChatMessage
          key={message.id}
          message={message}
        />
      ))}

      {/*
        The live reply. It disappears the moment the `done` event lands, by
        which point the finished message is already in `messages`.
      */}
      {isStreaming && streaming.parts.length > 0 ? (
        <BotMessage
          parts={streaming.parts}
          model={streaming.model}
          mode={streaming.mode}
          streaming
        />
      ) : null}
    </SessionShell>
  )
}

export function Session() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  // The new-session screen already has the created session in hand, so it
  // passes it through router state. Without this the visitor would watch a
  // spinner for a session that was fetched moments ago.
  const prefetched = useMemo(() => {
    const state = location.state as { session?: SessionData } | null

    return state?.session ?? null
  }, [location.state])

  const [session, setSession] = useState<SessionData | null>(prefetched)
  const [loading, setLoading] = useState(prefetched === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || prefetched) return

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

  // Keyed so switching sessions rebuilds the chat rather than carrying one
  // session's streaming state into another.
  return (
    <SessionChat
      key={session.id}
      session={session}
    />
  )
}
