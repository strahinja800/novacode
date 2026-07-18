import { TextAttributes } from '@opentui/core'
import type { ScrollBoxRenderable } from 'node_modules/@opentui/core/renderables/ScrollBox'
import type { RefObject } from 'react'

import { COMMANDS } from '@/constants/commands'

import getFilteredCommands from './filter-commands'

const MAX_VISIBLE_COMMANDS = 8
const COMMAND_COL_WITDH = Math.max(...COMMANDS.map(cmd => cmd.name.length)) + 4

type CommandMenuProps = {
  query: string
  selectedIndex: number
  onSelect: (index: number) => void
  onExecute: (index: number) => void
  scrollRef: RefObject<ScrollBoxRenderable | null>
}

export default function CommandMenu({
  query,
  selectedIndex,
  onSelect,
  onExecute,
  scrollRef,
}: CommandMenuProps) {
  const filtered = getFilteredCommands(query)
  const visibleHeight = Math.min(filtered.length, MAX_VISIBLE_COMMANDS)

  if (filtered.length === 0) {
    return (
      <box paddingX={1}>
        <text attributes={TextAttributes.DIM}>No commands found</text>
      </box>
    )
  }

  return (
    <scrollbox
      ref={scrollRef}
      height={visibleHeight}
    >
      {filtered.map((cmd, i) => {
        const isSelected = i === selectedIndex

        return (
          <box
            key={cmd.value}
            flexDirection='row'
            paddingX={1}
            height={1}
            overflow='hidden'
            backgroundColor={isSelected ? '#89b4fa' : undefined}
            onMouseMove={() => onSelect(i)}
            onMouseDown={() => onExecute(i)}
          >
            <box
              width={COMMAND_COL_WITDH}
              flexShrink={0}
            >
              <text
                selectable={false}
                fg={isSelected ? 'black' : 'white'}
              >
                /{cmd.name}
              </text>
            </box>
            <box
              flexGrow={1}
              flexShrink={1}
              overflow='hidden'
            >
              <text
                selectable={false}
                fg={isSelected ? 'black' : 'gray'}
              >
                {cmd.description}
              </text>
            </box>
          </box>
        )
      })}
    </scrollbox>
  )
}
