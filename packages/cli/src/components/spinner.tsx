import 'opentui-spinner/react'

import { Mode, type ModeType } from '@novacode/shared'

import { useTheme } from '@/providers/theme'

type Props = {
  mode?: ModeType
}

export function Spinner({ mode = Mode.BUILD }: Props) {
  const { colors } = useTheme()

  return (
    <spinner
      name='aesthetic'
      color={mode === Mode.PLAN ? colors.plan : colors.accent}
    />
  )
}
