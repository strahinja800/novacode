import type { Command, CommandContext } from '@/components/command-menu/types'
import { ThemeDialog } from '@/components/dialogs/theme-dialog'

export const COMMANDS: Command[] = [
  {
    name: 'new',
    description: 'Start a new conversation',
    value: '/new',
    action: ctx =>
      ctx.toast.show({
        message: 'Starting a new conversation...',
      }),
  },
  {
    name: 'agents',
    description: 'Switch between agents',
    value: '/agents',
    action: ctx => ctx.toast.show({ message: 'Switching agents...' }),
  },
  {
    name: 'models',
    description: 'Switch AI models for generation',
    value: '/models',
    action: ctx => ctx.toast.show({ message: 'Switching models...' }),
  },
  {
    name: 'session',
    description: 'Browse past sessions',
    value: '/session',
    action: ctx => ctx.toast.show({ message: 'Loading sessions...' }),
  },
  {
    name: 'theme',
    description: 'Change color theme',
    value: '/theme',
    action: ctx =>
      ctx.dialog.open({
        title: 'Select theme',
        children: <ThemeDialog />,
      }),
  },
  {
    name: 'login',
    description: 'Sign in with your browser',
    value: '/login',
    action: ctx => ctx.toast.show({ message: 'Opening browser for login...' }),
  },
  {
    name: 'logout',
    description: 'Sign out of your account',
    value: '/logout',
    action: ctx =>
      ctx.toast.show({ message: 'Signed out', variant: 'success' }),
  },
  {
    name: 'upgrade',
    description: 'Buy more credits',
    value: '/upgrade',
    action: ctx => ctx.toast.show({ message: 'Opening credits checkout...' }),
  },
  {
    name: 'usage',
    description: 'Open billing portal in your browser',
    value: '/usage',
    action: ctx => ctx.toast.show({ message: 'Opening billing portal...' }),
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
