import { Mode } from '@novacode/shared'
import { findSupportedChatModel } from '@novacode/shared'
import { TextAttributes } from '@opentui/core'

import { usePromptConfig } from '@/providers/prompt-config'
import { useThemeColors } from '@/providers/theme'

export function StatusBar() {
  const colors = useThemeColors()
  const { mode, model } = usePromptConfig()

  const isPlan = mode === Mode.PLAN

  const modelLabel = findSupportedChatModel(model)?.label ?? model

  return (
    <box
      flexDirection='row'
      gap={1}
    >
      <text fg={isPlan ? colors.plan : colors.accent}>
        {isPlan ? 'Plan' : 'Build'}
      </text>
      <text
        attributes={TextAttributes.DIM}
        fg={colors.muted}
      >
        {String.fromCharCode(0x203a)}
      </text>
      <text fg={colors.fg}>{modelLabel}</text>
    </box>
  )
}
