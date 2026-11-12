export type ThemeMode = 'system' | 'light' | 'dark'

export interface AppSettingsData {
  theme: ThemeMode
  /** Max messages kept per room; 0 means unlimited. */
  retentionMessagesPerRoom: number
  launchAtLogin: boolean
}
