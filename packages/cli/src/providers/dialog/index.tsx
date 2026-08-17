import { TextAttributes } from '@opentui/core'
import { useTerminalDimensions } from '@opentui/react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { useKeyboardLayer } from '@/providers/keyboard-layer'
import { useThemeColors } from '@/providers/theme'

import type { DialogConfig } from './types'

export type DialogContextValue = {
  open: (config: DialogConfig) => void
  close: () => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext)
  if (!value) throw new Error('useDialog must be used within DialogProvider')

  return value
}

export type DialogProviderProps = {
  children: ReactNode
}

export function DialogProvider({ children }: DialogProviderProps) {
  const [currentDialog, setCurrentDialog] = useState<DialogConfig | null>(null)

  const { push, pop } = useKeyboardLayer()

  const close = useCallback(() => {
    setCurrentDialog(null)
    pop('dialog')
  }, [pop])

  const open = useCallback(
    (config: DialogConfig) => {
      setCurrentDialog(config)
      push('dialog', () => {
        close()
        return true
      })
    },
    [push, close],
  )

  const value = useMemo<DialogContextValue>(
    () => ({ open, close }),
    [open, close],
  )

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Dialog currentDialog={currentDialog} />
    </DialogContext.Provider>
  )
}

type DialogProps = {
  currentDialog: DialogConfig | null
}

function Dialog({ currentDialog }: DialogProps) {
  const { width } = useTerminalDimensions()
  const colors = useThemeColors()

  if (!currentDialog) {
    return null
  }

  return (
    <box
      position='absolute'
      top={0}
      left={0}
      width={'100%'}
      height={'100%'}
      alignItems='center'
      justifyContent='center'
      zIndex={20}
    >
      <box
        width={Math.max(1, Math.min(64, width - 6))}
        flexDirection='column'
        gap={1}
        paddingX={2}
        paddingY={1}
        backgroundColor={colors.overlay}
        borderColor={colors.accent}
        border={['left']}
      >
        <text
          fg={colors.muted}
          attributes={TextAttributes.DIM}
        >
          {currentDialog.title}
        </text>
        {currentDialog.children}
      </box>
    </box>
  )
}
