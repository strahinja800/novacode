import { Mode, type ModeType } from '@novacode/shared'
import { TextAttributes } from '@opentui/core'
import prettyMilliseconds from 'pretty-ms'

import type { Message } from '@/hooks/use-chat'
import { useTheme } from '@/providers/theme'

type ClientMessagePart = Message['parts'][number]

type ToolPart = Extract<
  ClientMessagePart,
  { type: `tool-${string}` } | { type: 'dynamic-tool' }
>

type Props = {
  parts: ClientMessagePart[]
  model: string
  mode?: ModeType
  durationMs?: number
  streaming?: boolean
}

function isToolPart(part: ClientMessagePart): part is ToolPart {
  return part.type === 'dynamic-tool' || part.type.startsWith('tool-')
}

function getToolName(part: ToolPart): string {
  return part.type === 'dynamic-tool'
    ? part.toolName
    : part.type.slice('tool-'.length)
}

function formatToolName(name: string): string {
  const words = name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()

  return words.charAt(0).toUpperCase() + words.slice(1)
}

function formatToolArguments(part: ToolPart): string {
  const input = part.input

  if (input === null || typeof input !== 'object') return ''

  return Object.values(input as Record<string, unknown>)
    .filter(value => value !== null && value !== '' && value !== undefined)
    .map(value => String(value))
    .join(' ')
}

type PartGroup = {
  key: string
  isQuiet: boolean
  parts: ClientMessagePart[]
}

function groupConsecutiveParts(parts: ClientMessagePart[]): PartGroup[] {
  const groups: PartGroup[] = []

  parts.forEach((part, index) => {
    const isQuiet = isToolPart(part) || part.type === 'reasoning'
    const lastGroup = groups.at(-1)

    if (lastGroup && lastGroup.isQuiet === isQuiet) {
      lastGroup.parts.push(part)
      return
    }

    groups.push({
      key: `${part.type}-${index}`,
      isQuiet,
      parts: [part],
    })
  })

  return groups
}

export function BotMessage({
  parts,
  model,
  mode = Mode.BUILD,
  durationMs,
  streaming = false,
}: Props) {
  const { colors } = useTheme()

  const markerColor = mode === Mode.PLAN ? colors.plan : colors.accent

  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        width={'100%'}
        gap={1}
      >
        {groupConsecutiveParts(parts).map((group, groupIndex) => (
          <box
            key={group.key}
            paddingX={3}
            paddingTop={groupIndex === 0 ? 0 : 1}
            width={'100%'}
          >
            {!group.isQuiet ? (
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
                {group.parts.map((part, index) => {
                  if (part.type === 'reasoning') {
                    return (
                      <text
                        key={index}
                        fg={colors.thinking}
                        attributes={TextAttributes.DIM}
                      >
                        {part.text}
                      </text>
                    )
                  }

                  if (!isToolPart(part)) return null

                  const pending =
                    part.state !== 'output-available' &&
                    part.state !== 'output-error'

                  return (
                    <text
                      key={index}
                      fg={colors.thinking}
                    >
                      {`${formatToolName(getToolName(part))} ${formatToolArguments(part)}`.trim()}
                      {pending ? '...' : ''}
                    </text>
                  )
                })}
              </box>
            )}
          </box>
        ))}
      </box>

      {streaming ? null : (
        <box
          paddingX={3}
          paddingY={1}
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
              <text>{mode}</text>
              <text attributes={TextAttributes.DIM}>›</text>
              <text>{model}</text>

              {durationMs != null ? (
                <>
                  <text attributes={TextAttributes.DIM}>›</text>
                  <text>{prettyMilliseconds(durationMs)}</text>
                </>
              ) : null}
            </box>
          </box>
        </box>
      )}
    </box>
  )
}
