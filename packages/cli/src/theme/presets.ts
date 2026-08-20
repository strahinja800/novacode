import { RGBA } from '@opentui/core'

import type { Theme, ThemeColors } from './types'

const ANSI = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  white: 7,
  brightBlack: 8,
  brightRed: 9,
  brightGreen: 10,
  brightYellow: 11,
  brightBlue: 12,
  brightMagenta: 13,
  brightCyan: 14,
  cyan: 6,
} as const

type AccentSlots = {
  accent: number
  selection: number
}

function buildColors({ accent, selection }: AccentSlots): ThemeColors {
  return {
    ground: RGBA.defaultBackground(),
    raised: RGBA.fromIndex(ANSI.black),
    overlay: RGBA.fromIndex(ANSI.brightBlack),

    fg: RGBA.defaultForeground(),
    muted: RGBA.fromIndex(ANSI.white),
    inverse: RGBA.fromIndex(ANSI.black),

    accent: RGBA.fromIndex(accent),
    selection: RGBA.fromIndex(selection),

    success: RGBA.fromIndex(ANSI.green),
    error: RGBA.fromIndex(ANSI.red),
    info: RGBA.fromIndex(ANSI.cyan),

    plan: RGBA.fromIndex(ANSI.brightBlue),

    thinking: RGBA.fromIndex(ANSI.brightBlack),
  }
}

export const THEMES: Theme[] = [
  {
    name: 'Night Console',
    description: 'Signal cyan on the dark you already have',
    colors: buildColors({ accent: ANSI.cyan, selection: ANSI.blue }),
  },
  {
    name: 'Ember',
    description: 'A warmer rule down the left edge',
    colors: buildColors({ accent: ANSI.yellow, selection: ANSI.red }),
  },
  {
    name: 'Moss',
    description: 'Quiet green, easiest on a bright room',
    colors: buildColors({ accent: ANSI.green, selection: ANSI.brightGreen }),
  },
  {
    name: 'Orchid',
    description: 'Magenta accent for terminals that lean cool',
    colors: buildColors({
      accent: ANSI.magenta,
      selection: ANSI.brightMagenta,
    }),
  },
]

export const DEFAULT_THEME: Theme = THEMES[0]!

export function findTheme(name: string): Theme | undefined {
  return THEMES.find(theme => theme.name === name)
}
