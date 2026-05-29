import { TextAttributes } from '@opentui/core'

export function StatusBar() {
  return (
    <box
      flexDirection='row'
      gap={1}
    >
      <text fg={'cyan'}>Build</text>
      <text
        attributes={TextAttributes.DIM}
        fg={'gray'}
      >
        {String.fromCharCode(0x203a)}
      </text>
      <text>opus-4-6</text>
    </box>
  )
}
