import { createContext, useContext } from 'react'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

/** Must match the inline script in `index.html` that applies the theme before first paint. */
export const THEME_STORAGE_KEY = 'shipyard-theme'

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme)

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: string) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>')
  return context
}
