import { Mode } from '@novacode/database/enums'

import { useTheme } from '@/providers/theme'

type Props = {
  message: string
  /** The mode this was sent in, which may not be the mode selected now. */
  mode?: Mode
}

export function UserMessage({ message, mode = Mode.BUILD }: Props) {
  const { colors } = useTheme()

  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        border={['left']}
        borderColor={mode === Mode.PLAN ? colors.plan : colors.accent}
        width={'100%'}
      >
        <box
          justifyContent='center'
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.raised}
          width={'100%'}
        >
          <text>{message}</text>
        </box>
      </box>
    </box>
  )
}
