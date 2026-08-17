import { TextAttributes } from '@opentui/core'

import { useThemeColors } from '@/providers/theme'

import type { DialogSearchListProps } from './types'
import {
  MAX_VISIBLE_ITEMS,
  useDialogSearchList,
} from './use-dialog-search-list'

export function DialogSearchList<T>({
  items,
  onSelect,
  onHighlight,
  filterFn,
  renderItem,
  getKey,
  placeholder = 'Type to filter...',
  emptyText = 'Nothing matches',
}: DialogSearchListProps<T>) {
  const colors = useThemeColors()

  const {
    filtered,
    selectedIndex,
    inputRef,
    scrollRef,
    handleContentChange,
    highlight,
    execute,
  } = useDialogSearchList({ items, filterFn, onSelect, onHighlight })

  const visibleHeight = Math.min(filtered.length, MAX_VISIBLE_ITEMS)

  return (
    <box
      flexDirection='column'
      gap={1}
      width={'100%'}
    >
      <input
        ref={inputRef}
        focused
        placeholder={placeholder}
        onContentChange={handleContentChange}
      />

      {filtered.length === 0 ? (
        <text
          fg={colors.muted}
          attributes={TextAttributes.DIM}
        >
          {emptyText}
        </text>
      ) : (
        <scrollbox
          ref={scrollRef}
          height={visibleHeight}
        >
          {filtered.map((item, i) => {
            const isSelected = i === selectedIndex

            return (
              <box
                key={getKey(item)}
                flexDirection='row'
                paddingX={1}
                height={1}
                overflow='hidden'
                backgroundColor={isSelected ? colors.selection : undefined}
                onMouseMove={() => highlight(i)}
                onMouseDown={() => execute(i)}
              >
                {renderItem(item, isSelected)}
              </box>
            )
          })}
        </scrollbox>
      )}
    </box>
  )
}
