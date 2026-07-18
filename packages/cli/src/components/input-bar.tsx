import { useRenderer } from '@opentui/react'
import type { TextareaRenderable } from 'node_modules/@opentui/core/renderables/Textarea'
import process from 'process'
import { useCallback, useEffect, useRef } from 'react'

import { TEXTAREA_KEYBINDINGS } from '@/constants/textarea-keybinding'
import type { Command } from '@/types/command'

import CommandMenu from './command-menu'
import { UseCommandMenu } from './command-menu/use-command-menu'
import { StatusBar } from './status-bar'

type Props = {
  onSubmit: (value: string) => void
  disabled?: boolean
}

export function InputBar({ onSubmit, disabled = false }: Props) {
  const textareaRef = useRef<TextareaRenderable | null>(null)
  const onSubmitRef = useRef<() => void>(() => {})
  const renderer = useRenderer()

  const {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  } = UseCommandMenu()

  const handleCommandExecute = useCallback((index: number) => {
    const command = resolveCommand(index)
  }, [])

  const handleTextareaContentChange = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    handleContentChange(textarea.plainText)
  }, [])

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
          exit: () => {
            renderer.destroy()
            process.exit(0)
          },
        })
      } else {
        textarea.insertText(command.value + ' ')
      }
    },
    [renderer],
  )

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

  return (
    <box
      width={'100%'}
      alignItems='center'
    >
      <box
        border={['left']}
        borderColor={'cyan'}
        borderStyle='rounded'
      >
        <box
          position='relative'
          justifyContent='center'
          paddingY={1}
          paddingX={2}
          backgroundColor={'#1a1a24'}
          minWidth={'100%'}
          gap={1}
        >
          {showCommandMenu && (
            <box
              position='absolute'
              bottom={'100%'}
              left={0}
              width={'100%'}
              backgroundColor={'#1a1a34'}
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
            focused={!disabled}
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
