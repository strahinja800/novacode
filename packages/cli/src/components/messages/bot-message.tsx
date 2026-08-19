import { Mode } from '@novacode/database/enums'
import { TextAttributes } from '@opentui/core'

import type { ClientMessagePart } from '@/hooks/use-chat'
import { useTheme } from '@/providers/theme'

type Props = {
  parts: ClientMessagePart[]
  model: string
  mode: Mode
  /** Already humanized, e.g. `4.2s`. Absent while the reply is still arriving. */
  duration?: string
  streaming?: boolean
  interrupted?: boolean
}

export function BotMessage({
  parts,
  model,
  mode,
  duration,
  streaming = false,
  interrupted = false,
}: Props) {
  const { colors } = useTheme()

  const text = parts
    .filter(part => part.type === 'text')
    .map(part => part.text)
    .join('')

  // An interrupted reply is history, not an answer: the whole footer recedes
  // rather than announcing a model and a mode that never finished their work.
  const footerAttributes = interrupted ? TextAttributes.DIM : 0
  const markerColor = interrupted
    ? undefined
    : mode === Mode.PLAN
      ? colors.plan
      : colors.accent

  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        paddingY={1}
        width={'100%'}
      >
        <box
          paddingX={3}
          width={'100%'}
        >
          <text>{text}</text>
        </box>
      </box>

      {streaming ? null : (
        <box
          paddingX={3}
          paddingBottom={1}
          gap={1}
          width={'100%'}
        >
          <box
            flexDirection='row'
            gap={2}
          >
            <text fg={markerColor}>◉</text>

            <box
              flexDirection='row'
              gap={1}
            >
              <text attributes={footerAttributes}>{mode}</text>
              <text attributes={TextAttributes.DIM}>›</text>
              <text attributes={footerAttributes}>{model}</text>

              {interrupted || duration ? (
                <>
                  <text attributes={TextAttributes.DIM}>›</text>
                  <text attributes={footerAttributes}>
                    {interrupted ? 'interrupted' : duration}
                  </text>
                </>
              ) : null}
            </box>
          </box>
        </box>
      )}
    </box>
  )
}
