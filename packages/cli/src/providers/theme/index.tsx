import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

import { DEFAULT_THEME, findTheme } from '@/theme/presets'
import type { Theme, ThemeColors } from '@/theme/types'

const PREFERENCES_PATH = join(homedir(), '.novacode', 'preferences.json')

type Preferences = {
  themeName?: string
}

/**
 * Preferences are advisory. A missing file, malformed JSON, or a theme name
 * from a future version all mean the same thing: fall back to the default and
 * let the user carry on. Never let a preferences problem stop the app booting.
 */
function readInitialTheme(): Theme {
  try {
    const raw = readFileSync(PREFERENCES_PATH, 'utf8')
    const preferences = JSON.parse(raw) as Preferences

    if (typeof preferences?.themeName !== 'string') return DEFAULT_THEME

    return findTheme(preferences.themeName) ?? DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function persistTheme(theme: Theme) {
  try {
    mkdirSync(dirname(PREFERENCES_PATH), { recursive: true })

    // Read-modify-write so we do not clobber preferences owned by other
    // features once this file grows past the theme.
    let preferences: Preferences = {}
    try {
      preferences = JSON.parse(
        readFileSync(PREFERENCES_PATH, 'utf8'),
      ) as Preferences
    } catch {
      preferences = {}
    }

    preferences.themeName = theme.name

    writeFileSync(
      PREFERENCES_PATH,
      JSON.stringify(preferences, null, 2),
      'utf8',
    )
  } catch {
    // Persisting is best effort. The theme still applies for this session.
  }
}

export type ThemeContextValue = {
  theme: Theme
  colors: ThemeColors
  /** Apply and remember. Use for a confirmed choice. */
  setTheme: (theme: Theme) => void
  /** Apply without remembering. Use for live preview while browsing. */
  previewTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)

  if (!value) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return value
}

/** Convenience for the common case of only needing colors. */
export function useThemeColors(): ThemeColors {
  return useTheme().colors
}

type ThemeProviderProps = {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  const previewTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    persistTheme(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colors: theme.colors, setTheme, previewTheme }),
    [theme, setTheme, previewTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
