import type { CliRenderer } from '@opentui/core'

export function exitApp(renderer: CliRenderer) {
  setImmediate(() => {
    if (renderer.useKittyKeyboard) {
      renderer.disableKittyKeyboard()
    }

    renderer.destroy()
    process.exit(0)
  })
}
