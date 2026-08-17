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
        {/* Deliberately not accent: the left rule and the status bar already
            spend the two accent slots The One Cyan Rule allows. */}
        <ascii-font
          font='tiny'
          text='Code'
          color={colors.fg}
        />
      </box>
    </box>
  )
}
