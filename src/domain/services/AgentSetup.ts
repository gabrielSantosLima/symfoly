import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type SetupStyle = 'mcpServers' | 'opencode'

export interface SetupTarget {
  id: string
  label: string
  path: string
  /** Folder that proves the agent is installed (skips otherwise). */
  detect: string
  style: SetupStyle
}

export interface AgentEntry {
  command: string
  args: string[]
}

export interface SetupResult {
  id: string
  label: string
  path: string
  status: 'created' | 'updated' | 'unchanged' | 'skipped'
  message?: string
}

/** Merges the Symfoly MCP server into the config of installed agents. */
export class AgentSetup {
  constructor(private readonly targets: SetupTarget[]) {}

  run(entry: AgentEntry): SetupResult[] {
    return this.targets.map((target) => this.apply(target, entry))
  }

  private apply(target: SetupTarget, entry: AgentEntry): SetupResult {
    const fileExists = existsSync(target.path)
    if (!fileExists && !existsSync(target.detect)) {
      return { ...target, status: 'skipped', message: 'agent not found' }
    }

    let config: Record<string, unknown> = {}
    if (fileExists) {
      try {
        config = JSON.parse(readFileSync(target.path, 'utf8')) as Record<string, unknown>
      } catch {
        return { ...target, status: 'skipped', message: 'invalid JSON' }
      }
    }

    if (target.style === 'opencode') {
      const mcp = (config.mcp as Record<string, unknown> | undefined) ?? {}
      const servers = (mcp.servers as Record<string, unknown> | undefined) ?? {}
      config.mcp = {
        ...mcp,
        servers: {
          ...servers,
          symfoly: {
            type: 'local',
            command: [entry.command, ...entry.args],
            environment: { SYMFOLY_NAME: target.id },
          },
        },
      }
    } else {
      config.mcpServers = {
        ...(config.mcpServers as Record<string, unknown> | undefined),
        symfoly: {
          command: entry.command,
          args: entry.args,
          env: { SYMFOLY_NAME: target.id },
        },
      }
    }

    const serialized = `${JSON.stringify(config, null, 2)}\n`
    if (fileExists && readFileSync(target.path, 'utf8') === serialized) {
      return { ...target, status: 'unchanged' }
    }

    mkdirSync(dirname(target.path), { recursive: true })
    const temp = `${target.path}.tmp`
    writeFileSync(temp, serialized)
    renameSync(temp, target.path)
    return { ...target, status: fileExists ? 'updated' : 'created' }
  }
}
