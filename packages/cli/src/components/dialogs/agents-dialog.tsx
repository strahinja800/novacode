import { Mode } from '@novacode/database/enums'
import { TextAttributes } from '@opentui/core'

import { DialogSearchList } from '@/components/dialog-search-list'
import { useDialog } from '@/providers/dialog'
import { usePromptConfig } from '@/providers/prompt-config'
import { useThemeColors } from '@/providers/theme'

const MARKER_COL_WIDTH = 2
const ACTIVE_MARKER = String.fromCharCode(0x2022)

const AGENTS = [
  { mode: Mode.BUILD, label: 'Build', description: 'Write and change code' },
  { mode: Mode.PLAN, label: 'Plan', description: 'Think it through first' },
]

type Agent = (typeof AGENTS)[number]

export function AgentsDialog() {
  const colors = useThemeColors()
  const { close } = useDialog()
  const { mode, setMode } = usePromptConfig()

  const handleSelect = (agent: Agent) => {
    setMode(agent.mode)
    close()
  }

  return (
    <DialogSearchList<Agent>
      items={AGENTS}
      onSelect={handleSelect}
      getKey={item => item.mode}
      filterFn={(item, query) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      }
      placeholder='Filter agents...'
      emptyText='No agent by that name'
      renderItem={(item, isSelected) => (
        <>
          <box
            width={MARKER_COL_WIDTH}
            flexShrink={0}
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.accent}
            >
              {item.mode === mode ? ACTIVE_MARKER : ' '}
            </text>
          </box>
          <box
            width={8}
            flexShrink={0}
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.fg}
            >
              {item.label}
            </text>
          </box>
          <box
            flexGrow={1}
            flexShrink={1}
            overflow='hidden'
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.muted}
              attributes={isSelected ? undefined : TextAttributes.DIM}
            >
              {item.description}
            </text>
          </box>
        </>
      )}
    />
  )
}
