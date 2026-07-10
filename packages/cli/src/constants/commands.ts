import type { Command } from '@/types/command'
import type { CommandContext } from '@/types/command-context'

export const COMMANDS: Command[] = [
  {
    name: 'new',
    description: 'Start a new conversation',
    value: '/new',
  },
  {
    name: 'exit',
    description: 'Exit the application',
    value: '/exit',
    action: (ctx: CommandContext) => {
      ctx.exit()
    },
  },
]
