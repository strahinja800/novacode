import type { InputRenderable, ScrollBoxRenderable } from '@opentui/core'
import { useKeyboard } from '@opentui/react'
import { type RefObject, useMemo, useRef, useState } from 'react'

import { useDialog } from '@/providers/dialog'
import { useKeyboardLayer } from '@/providers/keyboard-layer'

export const MAX_VISIBLE_ITEMS = 6

type UseDialogSearchListProps<T> = {
  items: T[]
  filterFn: (item: T, query: string) => boolean
  onSelect: (item: T) => void
  onHighlight?: (item: T) => void
}

type UseDialogSearchListResult<T> = {
  query: string
  filtered: T[]
  selectedIndex: number
  inputRef: RefObject<InputRenderable | null>
  scrollRef: RefObject<ScrollBoxRenderable | null>
  handleContentChange: () => void
  highlight: (index: number) => void
  execute: (index: number) => void
}

export function useDialogSearchList<T>({
  items,
  filterFn,
  onSelect,
  onHighlight,
}: UseDialogSearchListProps<T>): UseDialogSearchListResult<T> {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<InputRenderable | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)

  const { isTopLayer } = useKeyboardLayer()
  const { close } = useDialog()

  const filtered = useMemo(
    () => (query ? items.filter(item => filterFn(item, query)) : items),
    [items, query, filterFn],
  )

  function handleContentChange() {
    const input = inputRef.current
    if (!input) return

    setQuery(input.value)
    setSelectedIndex(0)

    if (scrollRef.current) {
      scrollRef.current.scrollTo(0)
    }
  }

  function highlight(index: number) {
    setSelectedIndex(index)

    const item = filtered[index]
    if (item && onHighlight) onHighlight(item)
  }

  function execute(index: number) {
    const item = filtered[index]
    if (!item) return

    onSelect(item)
  }

  function move(delta: number) {
    const nextIndex = Math.min(
      Math.max(0, selectedIndex + delta),
      Math.max(0, filtered.length - 1),
    )

    if (nextIndex === selectedIndex) return

    const sb = scrollRef.current
    if (sb) {
      const viewportHeight = sb.viewport.height
      const visibleBottom = sb.scrollTop + viewportHeight - 1

      if (nextIndex < sb.scrollTop) {
        sb.scrollTo(nextIndex)
      } else if (nextIndex > visibleBottom) {
        sb.scrollTo(nextIndex - viewportHeight + 1)
      }
    }

    highlight(nextIndex)
  }

  useKeyboard(key => {
    if (!isTopLayer('dialog')) return

    if (key.name === 'escape') {
      key.preventDefault()
      close()
    } else if (key.name === 'return') {
      key.preventDefault()
      execute(selectedIndex)
    } else if (key.name === 'up') {
      key.preventDefault()
      move(-1)
    } else if (key.name === 'down') {
      key.preventDefault()
      move(1)
    }
  })

  return {
    query,
    filtered,
    selectedIndex,
    inputRef,
    scrollRef,
    handleContentChange,
    highlight,
    execute,
  }
}
