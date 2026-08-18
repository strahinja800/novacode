import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { BotMessage, ErrorMessage, UserMessage } from '@/components/messages'
import { SessionShell } from '@/components/session-shell'
import { useTheme } from '@/providers/theme'

export function NewSession() {
  const navigate = useNavigate()
  const location = useLocation()
  const { colors } = useTheme()

  const state = location.state as { message?: string } | null

  useEffect(() => {
    if (!state?.message) navigate('/', { replace: true })
  }, [state, navigate])

  if (!state?.message) return null

  return (
    <SessionShell
      onSubmit={() => {}}
      inputDisabled
      loading
    >
      <UserMessage message={state.message} />
      <BotMessage
        content='Sample bot response!'
        model='opus-4-6'
      />
      <ErrorMessage message='Sample error message!' />
    </SessionShell>
  )
}
