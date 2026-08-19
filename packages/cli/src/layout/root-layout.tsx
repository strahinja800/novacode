import { Outlet } from 'react-router'

import { DialogProvider } from '@/providers/dialog'
import { KeyboardLayerProvider } from '@/providers/keyboard-layer'
import { PromptConfigProvider } from '@/providers/prompt-config'
import { ThemeProvider } from '@/providers/theme'
import { ToastProvider } from '@/providers/toast'

import { ThemedRoot } from './themed-root'

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <KeyboardLayerProvider>
          <PromptConfigProvider>
            <DialogProvider>
              <ThemedRoot>
                <Outlet />
              </ThemedRoot>
            </DialogProvider>
          </PromptConfigProvider>
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
