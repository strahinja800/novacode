import 'opentui-spinner/react'

import { Mode } from '@novacode/database/enums'

import { useTheme } from '@/providers/theme'

type Props = {
  mode?: Mode
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
