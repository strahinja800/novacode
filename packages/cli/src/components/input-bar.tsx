import type { TextareaRenderable } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { useCallback, useEffect, useRef } from 'react'

import { TEXTAREA_KEYBINDINGS } from '@/constants/textarea-keybinding'
import { exitApp } from '@/lib/exit-app'
import { useDialog } from '@/providers/dialog'
import { useKeyboardLayer } from '@/providers/keyboard-layer'
import { useThemeColors } from '@/providers/theme'
import { useToast } from '@/providers/toast'

import CommandMenu from './command-menu'
import type { Command } from './command-menu/types'
import { useCommandMenu } from './command-menu/use-command-menu'
import { StatusBar } from './status-bar'

type Props = {
  onSubmit: (value: string) => void
  disabled?: boolean
}

export function InputBar({ onSubmit, disabled = false }: Props) {
  const textareaRef = useRef<TextareaRenderable | null>(null)
  const onSubmitRef = useRef<() => void>(() => {})
  const renderer = useRenderer()
  const toast = useToast()
  const dialog = useDialog()
  const colors = useThemeColors()
  const { isTopLayer, setResponder } = useKeyboardLayer()

  const {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  } = useCommandMenu()

  const handleSubmit = useCallback(() => {
    if (disabled) return

    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.plainText.trim()
    if (text.length === 0) return

    onSubmit(text)
    textarea.setText('')
  }, [disabled, onSubmit])

  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current
      if (!textarea || !command) return

      textarea.setText('')

      if (command.action) {
        command.action({
          exit: () => exitApp(renderer),
          toast,
          dialog,
        })
      } else {
        textarea.insertText(command.value + ' ')
      }
    },
    [renderer, toast, dialog],
  )

  const handleCommandExecute = useCallback(
    (index: number) => {
      handleCommand(resolveCommand(index))
    },
    [handleCommand, resolveCommand],
  )

  const handleTextareaContentChange = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    handleContentChange(textarea.plainText)
  }, [handleContentChange])

  // Wire up textarea submit handler
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.onSubmit = () => {
      onSubmitRef.current()
    }
  }, [])

  onSubmitRef.current = () => {
    if (disabled) return

    if (showCommandMenu) {
      const command = resolveCommand(selectedIndex)
      handleCommand(command)
      return
    }

    handleSubmit()
  }

  // Register the base layer responder for ctrl+c dismissal
  useEffect(() => {
    setResponder('base', () => {
      if (disabled) return false

      const textarea = textareaRef.current

      if (textarea && textarea.plainText.length > 0) {
        textarea.setText('')
        return true
      }
      return false
    })

    return () => setResponder('base', null)
  }, [disabled, setResponder])

  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        border={['left']}
        borderColor={colors.accent}
        borderStyle='rounded'
      >
        <box
          position='relative'
          justifyContent='center'
          paddingY={1}
          paddingX={2}
          backgroundColor={colors.raised}
          minWidth={'100%'}
          gap={1}
        >
          {showCommandMenu && (
            <box
              position='absolute'
              bottom={'100%'}
              left={0}
              width={'100%'}
              backgroundColor={colors.overlay}
              zIndex={10}
            >
              <CommandMenu
                query={commandQuery}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onExecute={handleCommandExecute}
                scrollRef={scrollRef}
              />
            </box>
          )}
          <textarea
            ref={textareaRef}
            focused={(!disabled && isTopLayer('base')) || isTopLayer('command')}
            onContentChange={handleTextareaContentChange}
            keyBindings={TEXTAREA_KEYBINDINGS}
            placeholder={`Ask anything... 'Fix a bug in database'`}
          />
          <StatusBar />
        </box>
      </box>
    </box>
  )
}
