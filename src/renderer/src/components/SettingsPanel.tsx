import { useAppData } from '../contexts/AppDataContext'
import type { ThemeMode } from '../../../shared/settings'
import { inputClass } from '../lib/ui'

export function SettingsPanel() {
  const { settings, saveSettings } = useAppData()
  if (!settings) return null

  return (
    <details className="text-sm">
      <summary className="cursor-pointer select-none text-slate-500 dark:text-slate-400">
        Settings
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <label className="flex items-center justify-between gap-2">
          <span>Theme</span>
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
        <label className="flex items-center justify-between gap-2">
          <span>Messages kept per room</span>
          <input
            type="number"
            min={0}
            className={`${inputClass} w-20`}
            value={settings.retentionMessagesPerRoom}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value)) void saveSettings({ retentionMessagesPerRoom: value })
            }}
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={settings.launchAtLogin}
            onChange={(event) => void saveSettings({ launchAtLogin: event.target.checked })}
          />
          <span>Launch at login</span>
        </label>
      </div>
    </details>
  )
}
