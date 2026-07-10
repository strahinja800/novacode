import { useKeyboard } from '@opentui/react'
import type { ScrollBoxRenderable } from 'node_modules/@opentui/core/renderables/ScrollBox'
import { type RefObject, useMemo, useRef, useState } from 'react'

import type { Command } from '@/types/command'

import getFilteredCommands from './filter-commands'

type UseCommandMenuProps = {
  showCommandMenu: boolean
  commandQuery: string
  selectedIndex: number
  scrollRef: RefObject<ScrollBoxRenderable | null>
  handleContentChange: (text: string) => void
  resolveCommand: (index: number) => Command | undefined
  setSelectedIndex: (index: number) => void
}

export function UseCommandMenu(): UseCommandMenuProps {
  const [textValue, setTextValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showCommandMenu, setShowCommandMenu] = useState(false)
  const scrollRef = useRef<ScrollBoxRenderable | null>(null)

  const commandQuery =
    showCommandMenu && textValue.startsWith('/') ? textValue.slice(1) : ''

  const filteredCommands = useMemo(
    () => getFilteredCommands(commandQuery),
    [commandQuery],
  )

  function handleContentChange(text: string) {
    setTextValue(text)
    setSelectedIndex(0)

    // Jump to top of the list when new character is typed
    if (scrollRef.current) {
      scrollRef.current.scrollTo(0)
    }

    const prefix = text.startsWith('/') ? text.slice(1) : null

    if (prefix !== null && !prefix.includes(' ')) setShowCommandMenu(true)
    else setShowCommandMenu(false)
  }

  // Resolve command at specific index
  function resolveCommand(index: number): Command | undefined {
    const command = filteredCommands[index]

    if (command) setShowCommandMenu(false)

    return command
  }

  // Arrow keys to move selection

  useKeyboard(key => {
    if (!showCommandMenu) return

    if (key.name === 'escape') {
      key.preventDefault()
      setShowCommandMenu(false)
    } else if (key.name === 'up') {
      key.preventDefault()
      setSelectedIndex((i: number) => {
        const newIndex = Math.max(0, i - 1)
        // Keep selected in view
        const sb = scrollRef.current
        if (sb && newIndex < sb.scrollTop) {
          sb.scrollTo(newIndex)
        }
        return newIndex
      })
    } else if (key.name === 'down') {
      key.preventDefault()
      setSelectedIndex((i: number) => {
        const newIndex = Math.min(filteredCommands.length - 1, i + 1)

        const sb = scrollRef.current

        if (sb) {
          const viewportHeight = sb.viewport.height
          const visibleBottom = sb.scrollTop + viewportHeight - 1
          if (newIndex > visibleBottom) {
            sb.scrollTo(newIndex - viewportHeight + 1)
          }
        }
        return newIndex
      })
    }
  })

  return {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  }
}
