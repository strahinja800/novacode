import { Mode } from '@novacode/database/enums'
import { TextAttributes } from '@opentui/core'

import type {
  ClientMessagePart,
  ClientToolCallPart,
} from '@/hooks/use-chat'
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

/** `read_file` and `readFile` both become `Read file`. */
function formatToolName(name: string): string {
  const words = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()

  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * The arguments, values only.
 *
 * Keys are dropped because the tool name already says what the value is — the
 * useful part of a `read_file` call is the path, not the word "path".
 */
function formatToolArguments(part: ClientToolCallPart): string {
  return Object.values(part.arguments)
    .filter(value => value !== null && value !== '')
    .map(value => String(value))
    .join(' ')
}

type PartGroup = {
  key: string
  type: ClientMessagePart['type']
  parts: ClientMessagePart[]
}

/**
 * Fold runs of same-typed parts into one block.
 *
 * Purely presentational, but it is the difference between one bordered block of
 * reasoning and forty of them stacked on top of each other.
 */
function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = []

  parts.forEach((part, index) => {
    const lastGroup = groups.at(-1)

    if (lastGroup?.type === part.type) {
      lastGroup.parts.push(part)
      return
    }

    groups.push({
      key: part.type === 'tool-call' ? `tool-${part.id}` : `${part.type}-${index}`,
      type: part.type,
      parts: [part],
    })
  })

  return groups
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
        gap={1}
      >
        {groupConsecutiveParts(parts).map(group => (
          <box
            key={group.key}
            paddingX={3}
            width={'100%'}
          >
            {group.type === 'text' ? (
              <text>
                {group.parts
                  .map(part => (part.type === 'text' ? part.text : ''))
                  .join('')}
              </text>
            ) : (
              <box
                border={['left']}
                borderColor={colors.thinking}
                width={'100%'}
                paddingLeft={1}
              >
                {group.parts.map((part, index) =>
                  part.type === 'reasoning' ? (
                    <text
                      key={index}
                      fg={colors.thinking}
                      attributes={TextAttributes.DIM}
                    >
                      {part.text}
                    </text>
                  ) : part.type === 'tool-call' ? (
                    <text
                      key={part.id}
                      fg={colors.thinking}
                    >
                      {`${formatToolName(part.name)} ${formatToolArguments(part)}`.trim()}
                      {part.status === 'calling' ? '...' : ''}
                    </text>
                  ) : null,
                )}
              </box>
            )}
          </box>
        ))}
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
