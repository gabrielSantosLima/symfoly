import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Channel = 'development' | 'beta' | 'production'

export interface ChannelConfig {
  name: string
  appUserModelId: string
  userData: string
  png: string
  ico: string
}

/** Mirrors the OhMyChannel channel scheme so dev/beta/release can coexist. */
export const CHANNELS: Record<Channel, ChannelConfig> = {
  development: {
    name: 'Symfoly Dev',
    appUserModelId: 'Symfoly.Dev',
    userData: 'Symfoly-dev',
    png: 'icon-dev.png',
    ico: 'icon-dev.ico',
  },
  beta: {
    name: 'Symfoly Beta',
    appUserModelId: 'Symfoly.Beta',
    userData: 'Symfoly-beta',
    png: 'icon-beta.png',
    ico: 'icon-beta.ico',
  },
  production: {
    name: 'Symfoly',
    appUserModelId: 'Symfoly',
    userData: 'Symfoly',
    png: 'icon.png',
    ico: 'icon.ico',
  },
}

function packagedChannel(): Channel {
  try {
    const pkg = JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')) as {
      channel?: string
    }
    return pkg.channel === 'beta' ? 'beta' : 'production'
  } catch {
    return 'production'
  }
}

export function resolveChannel(): Channel {
  const requested = process.env.SYMFOLY_CHANNEL as Channel | undefined
  if (requested && CHANNELS[requested]) return requested
  if (!app.isPackaged) return 'development'
  return packagedChannel()
}

/** Resolves a resource file in dev (project `resources/`) and when packaged. */
export function resourcePath(file: string): string {
  return app.isPackaged
    ? join(process.resourcesPath, file)
    : join(__dirname, '../../resources', file)
}
