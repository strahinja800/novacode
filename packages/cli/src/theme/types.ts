import type { RGBA } from '@opentui/core'

export type ThemeRole =
  | 'ground'
  | 'raised'
  | 'overlay'
  | 'fg'
  | 'muted'
  | 'inverse'
  | 'accent'
  | 'selection'
  | 'success'
  | 'error'
  | 'info'
  | 'plan'
  | 'thinking'

export type ThemeColors = Record<ThemeRole, RGBA>

export type Theme = {
  name: string
  description: string
  colors: ThemeColors
}
