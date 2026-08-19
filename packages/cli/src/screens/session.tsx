import type { InferResponseType } from 'hono/client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'

import { BotMessage, ErrorMessage, UserMessage } from '@/components/messages'
import { SessionShell } from '@/components/session-shell'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/http-errors'
import { useToast } from '@/providers/toast'

/**
 * Derived from the route itself, so a change to the server's response shape
 * shows up here as a type error rather than as a runtime surprise.
 */
type SessionData = InferResponseType<
  (typeof apiClient.sessions)[':id']['$get'],
  200
>

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

  const handleSubmit = useCallback(() => {
    // Sending follow-up messages arrives with chat streaming in a later chapter.
  }, [])

  if (!id) {
    navigate('/', { replace: true })
    return null
  }

  return (
    <SessionShell
      onSubmit={handleSubmit}
      inputDisabled
      loading={loading}
    >
      {error ? <ErrorMessage message={error} /> : null}
      {session?.messages.map(message =>
        message.role === 'USER' ? (
          <UserMessage
            key={message.id}
            message={message.content}
          />
        ) : (
          <BotMessage
            key={message.id}
            content={message.content}
            model={message.model}
          />
        ),
      )}
    </SessionShell>
  )
}
