import type { RGBA } from '@opentui/core'

/**
 * Semantic color roles. Components never name a color, only a role.
 *
 * Every role resolves to an indexed ANSI slot or to the terminal's own
 * default, never to a literal hex. See `presets.ts` for why that matters.
 */
export type ThemeRole =
  // Surfaces, from furthest back to closest front
  | 'ground'
  | 'raised'
  | 'overlay'
  // Text
  | 'fg'
  | 'muted'
  | 'inverse'
  // The single light source
  | 'accent'
  | 'selection'
  // Transient feedback only
  | 'success'
  | 'error'
  | 'info'
  // Plan mode. A state, not an accent: fixed across presets so it never
  // collides with whichever hue a preset chose to carry `accent`.
  | 'plan'

export type ThemeColors = Record<ThemeRole, RGBA>

export type Theme = {
  name: string
  description: string
  colors: ThemeColors
}
