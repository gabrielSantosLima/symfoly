import { join } from 'node:path'
import type { SetupTarget } from './AgentSetup'

export interface AgentTargetContext {
  platform: NodeJS.Platform
  home: string
  env: Record<string, string | undefined>
}

/** Per-OS base folder for application config (APPDATA / Library / XDG). */
export function configDir({ platform, home, env }: AgentTargetContext): string {
  if (platform === 'win32') return env.APPDATA ?? join(home, 'AppData', 'Roaming')
  if (platform === 'darwin') return join(home, 'Library', 'Application Support')
  return env.XDG_CONFIG_HOME ?? join(home, '.config')
}

/** Known agent config files, resolved per operating system. */
export function agentSetupTargets(context: AgentTargetContext): SetupTarget[] {
  const { home } = context
  const config = configDir(context)
  return [
    {
      id: 'opencode',
      label: 'OpenCode',
      path: join(home, '.config', 'opencode', 'opencode.json'),
      detect: join(home, '.config', 'opencode'),
      style: 'opencode',
    },
    {
      id: 'claude-desktop',
      label: 'Claude Desktop',
      path: join(config, 'Claude', 'claude_desktop_config.json'),
      detect: join(config, 'Claude'),
      style: 'mcpServers',
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      path: join(home, '.claude.json'),
      detect: join(home, '.claude'),
      style: 'mcpServers',
    },
    {
      id: 'cline',
      label: 'Cline (VS Code)',
      path: join(
        config,
        'Code',
        'User',
        'globalStorage',
        'saoudrizwan.claude-dev',
        'settings',
        'cline_mcp_settings.json',
      ),
      detect: join(config, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings'),
      style: 'mcpServers',
    },
  ]
}
