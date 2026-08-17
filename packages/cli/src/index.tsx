import { createCliRenderer } from '@opentui/core'
import { createRoot } from '@opentui/react'

import { Header } from './components/header'
import { InputBar } from './components/input-bar'
import { DialogProvider } from './providers/dialog'
import { KeyboardLayerProvider } from './providers/keyboard-layer'
import { ThemeProvider, useThemeColors } from './providers/theme'
import { ToastProvider } from './providers/toast'

function Shell() {
  const colors = useThemeColors()

  return (
    <box
      alignItems='center'
      justifyContent='center'
      backgroundColor={colors.ground}
      width={'100%'}
      height={'100%'}
      gap={2}
    >
      <Header />
      <box
        width={'100%'}
        maxWidth={78}
        paddingX={2}
      >
        <InputBar onSubmit={() => {}} />
      </box>
    </box>
  )
}

function App() {
  return (
    // Theme sits outermost because every layer below it reads colors.
    <ThemeProvider>
      <KeyboardLayerProvider>
        <ToastProvider>
          <DialogProvider>
            <Shell />
          </DialogProvider>
        </ToastProvider>
      </KeyboardLayerProvider>
    </ThemeProvider>
  )
}

const renderer = await createCliRenderer({
  targetFps: 60,
  exitOnCtrlC: false,
})
createRoot(renderer).render(<App />)
