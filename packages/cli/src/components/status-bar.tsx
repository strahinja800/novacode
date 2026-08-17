import { TextAttributes } from '@opentui/core'

import { useThemeColors } from '@/providers/theme'

export function StatusBar() {
  const colors = useThemeColors()

  return (
    <box
      flexDirection='row'
      gap={1}
    >
      <text fg={colors.accent}>Build</text>
      <text
        attributes={TextAttributes.DIM}
        fg={colors.muted}
      >
        {String.fromCharCode(0x203a)}
      </text>
      <text fg={colors.fg}>opus-4-6</text>
    </box>
  )
}
