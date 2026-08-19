import {
  SUPPORTED_CHAT_MODELS,
  type SupportedChatModel,
} from '@novacode/shared'
import { TextAttributes } from '@opentui/core'

import { DialogSearchList } from '@/components/dialog-search-list'
import { useDialog } from '@/providers/dialog'
import { usePromptConfig } from '@/providers/prompt-config'
import { useThemeColors } from '@/providers/theme'

const MARKER_COL_WIDTH = 2
const ACTIVE_MARKER = String.fromCharCode(0x2022)

const LABEL_COL_WIDTH =
  Math.max(...SUPPORTED_CHAT_MODELS.map(model => model.label.length)) + 4

// `SUPPORTED_CHAT_MODELS` is `as const`, so its entries are deeply readonly and
// the list component's `items: T[]` will not take it as-is.
const MODELS: SupportedChatModel[] = [...SUPPORTED_CHAT_MODELS]

export function ModelsDialog() {
  const colors = useThemeColors()
  const { close } = useDialog()
  const { model, setModel } = usePromptConfig()

  const handleSelect = (next: SupportedChatModel) => {
    setModel(next.id)
    close()
  }

  return (
    <DialogSearchList<SupportedChatModel>
      items={MODELS}
      onSelect={handleSelect}
      getKey={item => item.id}
      filterFn={(item, query) => {
        const needle = query.toLowerCase()

        return (
          item.label.toLowerCase().includes(needle) ||
          item.id.toLowerCase().includes(needle)
        )
      }}
      placeholder='Filter models...'
      emptyText='No model by that name'
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
              {item.id === model ? ACTIVE_MARKER : ' '}
            </text>
          </box>
          <box
            width={LABEL_COL_WIDTH}
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
              {item.provider}
            </text>
          </box>
        </>
      )}
    />
  )
}
