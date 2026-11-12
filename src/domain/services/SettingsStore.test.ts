// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AppSettings } from '../entities/AppSettings'
import { SettingsStore } from './SettingsStore'

function tempFile(): string {
  return join(mkdtempSync(join(tmpdir(), 'symfoly-')), 'settings.json')
}

describe('SettingsStore', () => {
  it('returns defaults when the file is missing', () => {
    expect(new SettingsStore(tempFile()).load()).toEqual(AppSettings.defaults())
  })

  it('round-trips settings', () => {
    const store = new SettingsStore(tempFile())
    store.save({ theme: 'dark', retentionMessagesPerRoom: 50, launchAtLogin: true })
    expect(store.load()).toEqual({
      theme: 'dark',
      retentionMessagesPerRoom: 50,
      launchAtLogin: true,
    })
  })

  it('normalizes invalid values', () => {
    expect(AppSettings.normalize({ theme: 'neon' as never, retentionMessagesPerRoom: -5 })).toEqual(
      {
        theme: 'system',
        retentionMessagesPerRoom: 0,
        launchAtLogin: false,
      },
    )
  })
})
