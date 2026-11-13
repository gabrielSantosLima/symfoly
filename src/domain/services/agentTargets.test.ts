// @vitest-environment node
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { agentSetupTargets, configDir } from './agentTargets'

function target(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
  id: string,
  home = '/home/u',
) {
  const targets = agentSetupTargets({ platform, home, env })
  const found = targets.find((entry) => entry.id === id)
  if (!found) throw new Error(`missing target ${id}`)
  return found
}

describe('agentTargets', () => {
  it('resolves the config dir per OS', () => {
    expect(
      configDir({
        platform: 'win32',
        home: 'C:/Users/u',
        env: { APPDATA: 'C:/Users/u/AppData/Roaming' },
      }),
    ).toBe('C:/Users/u/AppData/Roaming')
    expect(configDir({ platform: 'darwin', home: '/Users/u', env: {} })).toBe(
      join('/Users/u', 'Library', 'Application Support'),
    )
    expect(configDir({ platform: 'linux', home: '/home/u', env: {} })).toBe(
      join('/home/u', '.config'),
    )
    expect(
      configDir({ platform: 'linux', home: '/home/u', env: { XDG_CONFIG_HOME: '/cfg' } }),
    ).toBe('/cfg')
  })

  it('points Claude Desktop at the right file on Linux', () => {
    expect(target('linux', {}, 'claude-desktop').path).toBe(
      join('/home/u', '.config', 'Claude', 'claude_desktop_config.json'),
    )
  })

  it('points Claude Desktop at the right file on macOS', () => {
    expect(target('darwin', {}, 'claude-desktop', '/Users/u').path).toBe(
      join('/Users/u', 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    )
  })

  it('keeps the Windows Claude Desktop path under APPDATA', () => {
    expect(target('win32', { APPDATA: 'C:/Users/u/AppData/Roaming' }, 'claude-desktop').path).toBe(
      join('C:/Users/u/AppData/Roaming', 'Claude', 'claude_desktop_config.json'),
    )
  })

  it('points Cline at the VS Code user dir per OS', () => {
    expect(target('linux', {}, 'cline').path).toBe(
      join(
        '/home/u',
        '.config',
        'Code',
        'User',
        'globalStorage',
        'saoudrizwan.claude-dev',
        'settings',
        'cline_mcp_settings.json',
      ),
    )
  })
})
