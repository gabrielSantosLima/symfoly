import { useAppData } from '../contexts/AppDataContext'
import type { ThemeMode } from '../../../shared/settings'
import { inputClass } from '../lib/ui'

export function SettingsForm() {
  const { settings, saveSettings } = useAppData()
  if (!settings) return <p className="text-sm text-muted">Loading…</p>

  return (
    <div className="flex flex-col gap-4 text-sm">
      <label className="flex items-center justify-between gap-4">
        <span className="text-muted">Theme</span>
        <select
          className={inputClass}
          value={settings.theme}
          onChange={(event) => void saveSettings({ theme: event.target.value as ThemeMode })}
        >
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-4">
        <span className="text-muted">Messages kept per room</span>
        <input
          type="number"
          min={0}
          className={`${inputClass} w-24`}
          value={settings.retentionMessagesPerRoom}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (Number.isFinite(value)) void saveSettings({ retentionMessagesPerRoom: value })
          }}
        />
      </label>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.launchAtLogin}
          onChange={(event) => void saveSettings({ launchAtLogin: event.target.checked })}
        />
        <span className="text-muted">Launch at login</span>
      </label>
    </div>
  )
}
