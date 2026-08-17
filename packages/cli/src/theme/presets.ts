import { RGBA } from '@opentui/core'

import type { Theme, ThemeColors } from './types'

/**
 * Standard ANSI palette slots.
 *
 * `RGBA.fromIndex` produces a color with "indexed" intent, which the renderer
 * emits as a palette reference rather than a literal RGB triplet. The user's
 * terminal decides what slot 6 actually looks like, which is the whole point.
 *
 * Passing a bare string like 'cyan' does NOT do this. OpenTUI resolves named
 * colors through a fixed hex table, so a string is just a hex value wearing a
 * friendly name and the terminal never gets a say.
 */
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

/**
 * Every preset shares one surface and text vocabulary and differs only in which
 * hue carries the accent. That is a deliberate consequence of staying on the
 * ANSI palette: there is no room for eleven bespoke ramps, and the restraint
 * matches "cyan as a rationed light source" from the design system.
 */
function buildColors({ accent, selection }: AccentSlots): ThemeColors {
  return {
    // The terminal's own background. We do not repaint the room.
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
