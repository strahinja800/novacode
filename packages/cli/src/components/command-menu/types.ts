import type { DialogContextValue } from '@/providers/dialog'
import type { ToastContextValue } from '@/providers/toast'

/**
 * What a command can reach.
 *
 * Mode and model are absent on purpose: `PromptConfigProvider` sits above
 * `DialogProvider`, so a dialog reads them itself rather than being handed a
 * snapshot that goes stale the moment it changes.
 */
export type CommandContext = {
  exit: () => void
  navigate: (to: string) => void
  toast: ToastContextValue
  dialog: DialogContextValue
}

export type Command = {
  name: string
  description: string
  value: string
  action?: (ctx: CommandContext) => void | Promise<void>
}
