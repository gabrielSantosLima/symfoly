import { useEffect } from 'react'
import type { AppSettingsData } from '../../../shared/settings'

/** Applies the resolved theme (system/light/dark) to <html data-theme>. */
export function useTheme(settings: AppSettingsData | null): void {
  useEffect(() => {
    if (!settings || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (): void => {
      const resolved =
        settings.theme === 'system' ? (media.matches ? 'dark' : 'light') : settings.theme
      document.documentElement.dataset.theme = resolved
    }
    apply()
    if (settings.theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [settings])
}
