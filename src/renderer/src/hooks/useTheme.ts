import { useEffect, useState } from 'react'
import type { AppSettingsData } from '../../../shared/settings'

export type ResolvedTheme = 'light' | 'dark'

/**
 * Applies the resolved theme to `<html data-theme>` and returns it, so callers
 * can render theme-dependent UI in the same pass instead of reading the DOM.
 */
export function useTheme(settings: AppSettingsData | null): ResolvedTheme {
  const [systemDark, setSystemDark] = useState(
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemDark(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const mode = settings?.theme ?? 'system'
  const resolved: ResolvedTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])

  return resolved
}
