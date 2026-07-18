import type { Command } from '@/types/command'
import type { CommandContext } from '@/types/command-context'

export const COMMANDS: Command[] = [
  {
    name: 'new',
    description: 'Start a new conversation',
    value: '/new',
  },
  {
    name: 'agents',
    description: 'Switch between agents',
    value: '/agents',
  },
  {
    name: 'models',
    description: 'Switch AI models for generation',
    value: '/models',
  },
  {
    name: 'session',
    description: 'Browse past sessions',
    value: '/session',
  },
  {
    name: 'theme',
    description: 'Change color theme',
    value: '/theme',
  },
  {
    name: 'login',
    description: 'Sign in with your browser',
    value: '/login',
  },
  {
    name: 'logout',
    description: 'Sign out of your account',
    value: '/logout',
  },
  {
    name: 'upgrade',
    description: 'Buy more credits',
    value: '/upgrade',
  },
  {
    name: 'usage',
    description: 'Open billing portal in your browser',
    value: '/usage',
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
