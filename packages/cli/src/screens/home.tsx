import { TextAttributes } from '@opentui/core'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'

import { Header } from '@/components/header'
import { InputBar } from '@/components/input-bar'
import { usePromptConfig } from '@/providers/prompt-config'

export function Home() {
  const navigate = useNavigate()
  const { mode, model } = usePromptConfig()

  const handleSubmit = useCallback(
    (text: string) => {
      // Carried through router state rather than read again on the next
      // screen: this is a snapshot of what was chosen at the moment of sending.
      navigate('sessions/new', { state: { message: text, mode, model } })
    },
    [navigate, mode, model],
  )

  return (
    <box
      alignItems='center'
      justifyContent='center'
      flexGrow={1}
      gap={2}
      position='relative'
      width={'100%'}
      height={'100%'}
    >
      <Header />
      <box
        width={'100%'}
        maxWidth={78}
        paddingX={2}
        flexDirection='column'
        gap={1}
      >
        <InputBar onSubmit={handleSubmit} />
        <box paddingLeft={2}>
          <text attributes={TextAttributes.DIM}>tab to switch mode</text>
        </box>
      </box>
    </box>
  )
}
