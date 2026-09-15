import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { isTheme, THEME_STORAGE_KEY, ThemeContext, type Theme } from '@/hooks/use-theme'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedTheme = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const setTheme = useCallback((next: string) => {
    const value = isTheme(next) ? next : 'system'
    setThemeState(value)
    try {
      if (value === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // Storage unavailable (private mode): the choice lasts for this session only.
    }
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])
  return <ThemeContext value={value}>{children}</ThemeContext>
}
