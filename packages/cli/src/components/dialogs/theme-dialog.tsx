import { TextAttributes } from '@opentui/core'
import { useEffect, useRef } from 'react'

import { DialogSearchList } from '@/components/dialog-search-list'
import { useDialog } from '@/providers/dialog'
import { useTheme, useThemeColors } from '@/providers/theme'
import { THEMES } from '@/theme/presets'
import type { Theme } from '@/theme/types'

const NAME_COL_WIDTH = Math.max(...THEMES.map(theme => theme.name.length)) + 4
const MARKER_COL_WIDTH = 2
const ACTIVE_MARKER = String.fromCharCode(0x2022)

export function ThemeDialog() {
  const { theme, setTheme, previewTheme } = useTheme()
  const colors = useThemeColors()
  const { close } = useDialog()

  const originalThemeRef = useRef<Theme>(theme)
  const committedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (!committedRef.current) previewTheme(originalThemeRef.current)
    }
  }, [previewTheme])

  const handleSelect = (next: Theme) => {
    committedRef.current = true
    setTheme(next)
    close()
  }

  return (
    <DialogSearchList<Theme>
      items={THEMES}
      onSelect={handleSelect}
      onHighlight={previewTheme}
      getKey={item => item.name}
      filterFn={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      }
      placeholder='Filter themes...'
      emptyText='No theme by that name'
      renderItem={(item, isSelected) => (
        <>
          {}
          <box
            width={MARKER_COL_WIDTH}
            flexShrink={0}
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.accent}
            >
              {item.name === originalThemeRef.current.name ? ACTIVE_MARKER : ' '}
            </text>
          </box>
          <box
            width={NAME_COL_WIDTH}
            flexShrink={0}
          >
            <text
              selectable={false}
              fg={isSelected ? colors.inverse : colors.fg}
            >
              {item.name}
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
