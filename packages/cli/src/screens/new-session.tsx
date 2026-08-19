import process from 'node:process'

import { Mode } from '@novacode/database/enums'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { z } from 'zod'

import { UserMessage } from '@/components/messages'
import { SessionShell } from '@/components/session-shell'
import { apiClient } from '@/lib/api-client'
import { getErrorMessage } from '@/lib/http-errors'
import { useToast } from '@/providers/toast'

const newSessionStateSchema = z.object({
  message: z.string().min(1),
  mode: z.enum(Mode),
  model: z.string().min(1),
})

/**
 * The screen that exists so the visitor never waits on a blank home screen.
 *
 * It renders their message immediately, creates the session in the background,
 * and hands off to the real session screen. Nothing is displayed here that the
 * session screen won't show again — this is a bridge, not a destination.
 */
export function NewSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Effects can fire twice; the session must not be created twice.
  const hasStartedRef = useRef(false)

  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state)

    return parsed.success ? parsed.data : null
  }, [location.state])

  // Reached without state (a stray navigation, a reload) — there is nothing to
  // create, so go back rather than sit on an empty screen.
  useEffect(() => {
    if (!state) navigate('/', { replace: true })
  }, [state, navigate])

  useEffect(() => {
    if (!state || hasStartedRef.current) return

    hasStartedRef.current = true
    let ignore = false

    const createSession = async () => {
      try {
        const response = await apiClient.sessions.$post({
          json: {
            title: state.message.slice(0, 100),
            path: process.cwd(),
            model: state.model,
            initialMessage: {
              role: 'USER',
              content: state.message,
              mode: state.mode,
            },
          },
        })

        if (ignore) return

        if (!response.ok) {
          throw new Error(await getErrorMessage(response))
        }

        const session = await response.json()

        if (ignore) return

        navigate(`/sessions/${session.id}`, {
          replace: true,
          state: { session },
        })
      } catch (error) {
        if (ignore) return

        toast.show({
          variant: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to create session',
        })

        // Never strand the visitor on a bridge screen that will never resolve.
        navigate('/', { replace: true })
      }
    }

    void createSession()

    return () => {
      ignore = true
    }
  }, [state, navigate, toast])

  if (!state) return null

  return (
    <SessionShell
      onSubmit={() => {}}
      inputDisabled
      loading
    >
      <UserMessage
        message={state.message}
        mode={state.mode}
      />
    </SessionShell>
  )
}
