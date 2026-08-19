import { type ScrollBoxRenderable, TextAttributes } from '@opentui/core'
import type { RefObject } from 'react'

import { useThemeColors } from '@/providers/theme'

import type { MentionCandidate } from './types'

const MAX_VISIBLE_MENTIONS = 8
const KIND_COL_WIDTH = 10

type FileMentionMenuProps = {
  candidates: MentionCandidate[]
  selectedIndex: number
  onSelect: (index: number) => void
  onExecute: (index: number) => void
  scrollRef: RefObject<ScrollBoxRenderable | null>
}

export default function FileMentionMenu({
  candidates,
  selectedIndex,
  onSelect,
  onExecute,
  scrollRef,
}: FileMentionMenuProps) {
  const colors = useThemeColors()
  const visibleHeight = Math.min(candidates.length, MAX_VISIBLE_MENTIONS)

  if (candidates.length === 0) {
    return (
      <box paddingX={1}>
        <text
          fg={colors.muted}
          attributes={TextAttributes.DIM}
        >
          No matching files
        </text>
      </box>
    )
  }

  return (
    <scrollbox
      ref={scrollRef}
      height={visibleHeight}
    >
      {candidates.map((candidate, index) => {
        const isSelected = index === selectedIndex

        return (
          <box
            key={candidate.path}
            flexDirection='row'
            paddingX={1}
            height={1}
            overflow='hidden'
            backgroundColor={isSelected ? colors.selection : undefined}
            onMouseMove={() => onSelect(index)}
            onMouseDown={() => onExecute(index)}
          >
            <box
              flexGrow={1}
              flexShrink={1}
              overflow='hidden'
            >
              <text
                selectable={false}
                fg={isSelected ? colors.inverse : colors.fg}
              >
                {candidate.path}
              </text>
            </box>
            <box
              width={KIND_COL_WIDTH}
              flexShrink={0}
            >
              <text
                selectable={false}
                fg={isSelected ? colors.inverse : colors.muted}
                attributes={isSelected ? undefined : TextAttributes.DIM}
              >
                {candidate.kind === 'directory' ? 'folder' : 'file'}
              </text>
            </box>
          </box>
        )
      })}
    </scrollbox>
  )
}
