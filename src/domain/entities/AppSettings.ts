import type { AppSettingsData, ThemeMode } from '../../shared/settings'

const THEMES: ThemeMode[] = ['system', 'light', 'dark']

export class AppSettings {
  static defaults(): AppSettingsData {
    return { theme: 'system', retentionMessagesPerRoom: 1000, launchAtLogin: false }
  }

  static normalize(input: Partial<AppSettingsData> | undefined): AppSettingsData {
    const defaults = AppSettings.defaults()
    if (!input) return defaults
    const theme = THEMES.includes(input.theme as ThemeMode)
      ? (input.theme as ThemeMode)
      : defaults.theme
    const retention = Number.isFinite(input.retentionMessagesPerRoom)
      ? Math.max(0, Math.floor(input.retentionMessagesPerRoom as number))
      : defaults.retentionMessagesPerRoom
    const launchAtLogin =
      typeof input.launchAtLogin === 'boolean' ? input.launchAtLogin : defaults.launchAtLogin
    return { theme, retentionMessagesPerRoom: retention, launchAtLogin }
  }
}
