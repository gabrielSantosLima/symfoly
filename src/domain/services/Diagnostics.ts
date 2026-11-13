import { existsSync, readdirSync, readFileSync } from 'node:fs'
import type { DiagnosticsReport } from '../../shared/ipc'
import type { SetupTarget } from './AgentSetup'
import type { SkillTarget } from './agentTargets'

function isConfigured(target: SetupTarget): boolean {
  if (!existsSync(target.path)) return false
  try {
    const config = JSON.parse(readFileSync(target.path, 'utf8')) as Record<string, unknown>
    if (target.style === 'opencode') {
      const mcp = config.mcp as Record<string, unknown> | undefined
      const servers = mcp?.servers as Record<string, unknown> | undefined
      return Boolean(servers?.symfoly ?? mcp?.symfoly)
    }
    const servers = config.mcpServers as Record<string, unknown> | undefined
    return Boolean(servers?.symfoly)
  } catch {
    return false
  }
}

function hasSkills(dir: string): boolean {
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).some((name) => name.startsWith('symfoly'))
  } catch {
    return false
  }
}

/** Checks whether the hub and each agent/skill target are wired up. */
export function runDiagnostics(input: {
  endpointFile: string
  endpointPresent: boolean
  port: number
  hubUrl: string
  agentTargets: SetupTarget[]
  skillTargets: SkillTarget[]
}): DiagnosticsReport {
  return {
    endpointFile: input.endpointFile,
    endpointPresent: input.endpointPresent,
    port: input.port,
    hubUrl: input.hubUrl,
    agents: input.agentTargets.map((target) => ({
      id: target.id,
      label: target.label,
      path: target.path,
      detected: existsSync(target.detect) || existsSync(target.path),
      configured: isConfigured(target),
    })),
    skills: input.skillTargets.map((target) => ({
      id: target.id,
      label: target.label,
      dir: target.dir,
      detected: existsSync(target.detect),
      installed: hasSkills(target.dir),
    })),
  }
}
