import { useTheme } from '@/providers/theme'

type Props = {
  message: string
}

export function UserMessage({ message }: Props) {
  const { colors } = useTheme()

  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        border={['left']}
        borderColor={colors.accent}
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
