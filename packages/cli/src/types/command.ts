import type { CommandContext } from './command-context'

export type Command = {
  name: string
  description: string
  value: string
  action?: (ctx: CommandContext) => void | Promise<void>
}
