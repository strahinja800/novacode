import type { Command, CommandContext } from '@/components/command-menu/types'
import {
  AgentsDialog,
  ModelsDialog,
  SessionsDialog,
  ThemeDialog,
} from '@/components/dialogs'
import { clearAuth } from '@/lib/auth'
import { performLogin } from '@/lib/oauth'
import { openBillingPortal, openUpgradeCheckout } from '@/lib/upgrade'

export const COMMANDS: Command[] = [
  {
    name: 'new',
    description: 'Start a new conversation',
    value: '/new',
    action: ctx => ctx.navigate('/'),
  },
  {
    name: 'agents',
    description: 'Switch between agents',
    value: '/agents',
    action: ctx =>
      ctx.dialog.open({
        title: 'Select agent',
        children: <AgentsDialog />,
      }),
  },
  {
    name: 'models',
    description: 'Switch AI models for generation',
    value: '/models',
    action: ctx =>
      ctx.dialog.open({
        title: 'Select model',
        children: <ModelsDialog />,
      }),
  },
  {
    name: 'session',
    description: 'Browse past sessions',
    value: '/session',
    action: ctx =>
      ctx.dialog.open({
        title: 'Open session',
        children: <SessionsDialog />,
      }),
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
    action: async ctx => {
      ctx.toast.show({ message: 'Opening browser for login...' })

      try {
        await performLogin()
        ctx.toast.show({ message: 'Signed in', variant: 'success' })
      } catch (caught) {
        ctx.toast.show({
          variant: 'error',
          message: caught instanceof Error ? caught.message : 'Login failed',
        })
      }
    },
  },
  {
    name: 'logout',
    description: 'Sign out of your account',
    value: '/logout',
    action: ctx => {
      clearAuth()
      ctx.toast.show({ message: 'Signed out', variant: 'success' })
    },
  },
  {
    name: 'upgrade',
    description: 'Buy more credits',
    value: '/upgrade',
    action: async ctx => {
      ctx.toast.show({ message: 'Opening credits checkout...' })

      try {
        await openUpgradeCheckout()
        ctx.toast.show({ message: 'Checkout open in browser', variant: 'success' })
      } catch (caught) {
        ctx.toast.show({
          variant: 'error',
          message:
            caught instanceof Error ? caught.message : 'Could not open checkout',
        })
      }
    },
  },
  {
    name: 'usage',
    description: 'Open billing portal in your browser',
    value: '/usage',
    action: async ctx => {
      ctx.toast.show({ message: 'Opening billing portal...' })

      try {
        await openBillingPortal()
        ctx.toast.show({ message: 'Portal open in browser', variant: 'success' })
      } catch (caught) {
        ctx.toast.show({
          variant: 'error',
          message:
            caught instanceof Error ? caught.message : 'Could not open portal',
        })
      }
    },
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
