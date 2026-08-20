import { useThemeColors } from '@/providers/theme'

export function Header() {
  const colors = useThemeColors()

  return (
    <box
      justifyContent='center'
      alignItems='center'
    >
      <box
        flexDirection='row'
        justifyContent='center'
        gap={0.5}
        alignItems='center'
      >
        <ascii-font
          font='tiny'
          text='Nova'
          color={colors.muted}
        />
        {}
        <ascii-font
          font='tiny'
          text='Code'
          color={colors.fg}
        />
      </box>
    </box>
  )
}
