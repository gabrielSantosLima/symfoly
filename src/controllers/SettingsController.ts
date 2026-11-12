import { AppSettings } from '../domain/entities/AppSettings'
import type { SettingsStore } from '../domain/services/SettingsStore'
import type { AppSettingsData } from '../shared/settings'

/** Thin IPC-facing controller: reads and merges settings. */
export class SettingsController {
  constructor(private readonly store: SettingsStore) {}

  get(): AppSettingsData {
    return this.store.load()
  }

  save(patch: Partial<AppSettingsData>): AppSettingsData {
    const next = AppSettings.normalize({ ...this.store.load(), ...patch })
    this.store.save(next)
    return next
  }
}
