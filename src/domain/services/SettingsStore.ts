import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { AppSettingsData } from '../../shared/settings'
import { AppSettings } from '../entities/AppSettings'

export function defaultSettingsPath(): string {
  const base = process.env.SYMFOLY_HOME ?? join(homedir(), '.symfoly')
  return join(base, 'settings.json')
}

export class SettingsStore {
  constructor(private readonly filePath: string) {}

  load(): AppSettingsData {
    if (!existsSync(this.filePath)) return AppSettings.defaults()
    try {
      return AppSettings.normalize(JSON.parse(readFileSync(this.filePath, 'utf8')))
    } catch {
      return AppSettings.defaults()
    }
  }

  save(settings: AppSettingsData): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    writeFileSync(temp, `${JSON.stringify(settings, null, 2)}\n`)
    renameSync(temp, this.filePath)
  }
}
