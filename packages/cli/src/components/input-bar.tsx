import { TEXTAREA_KEYBINDINGS } from '@/constants/textarea-keybinding'

import { StatusBar } from './status-bar'

type Props = {
  onSubmit: (value: string) => void
  disabled?: boolean
}

export function InputBar({ onSubmit, disabled = false }: Props) {
  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        border={['left']}
        borderColor={'cyan'}
        borderStyle='rounded'
      >
        <box
          position='relative'
          justifyContent='center'
          paddingY={1}
          paddingX={2}
          backgroundColor={'#1a1a24'}
          minWidth={'100%'}
          gap={1}
        >
          <textarea
            focused={!disabled}
            keyBindings={TEXTAREA_KEYBINDINGS}
            placeholder={`Ask anything... 'Fix a bug in database'`}
          />
          <StatusBar />
        </box>
      </box>
    </box>
  )
}
