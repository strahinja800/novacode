import type { CliRenderer } from '@opentui/core'

/**
 * Tear down the renderer and leave the process.
 *
 * The scheduling matters. `renderer.destroy()` checks whether it is being
 * called mid-frame, and if so it only suspends and marks the teardown pending,
 * leaving the real work to the render loop's `finally` block. It also flips its
 * own `_isDestroyed` guard immediately, so a second call can never finish the
 * job. Calling it straight from a keyboard handler and exiting in the same tick
 * therefore risks cutting the teardown short and leaving the terminal in kitty
 * keyboard mode — where the next Ctrl+C prints `^[[99;5u` at the shell instead
 * of being handled.
 *
 * Stepping out of the frame first means `destroy()` takes its synchronous path
 * and fully restores the terminal before we exit.
 *
 * The kitty pop is ours to do. OpenTUI's teardown restores the cursor, mouse
 * modes, bracketed paste, the alt screen and the title, but it never disables
 * the kitty keyboard protocol it turned on at startup. Left on, the shell we
 * hand the terminal back to receives `ESC[99;5u` for Ctrl+C — a sequence it
 * does not understand — and prints it instead of sending a signal.
 */
export function exitApp(renderer: CliRenderer) {
  setImmediate(() => {
    if (renderer.useKittyKeyboard) {
      renderer.disableKittyKeyboard()
    }

    renderer.destroy()
    process.exit(0)
  })
}
