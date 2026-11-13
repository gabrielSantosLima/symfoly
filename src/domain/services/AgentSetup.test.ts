// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AgentSetup, type SetupStyle, type SetupTarget } from './AgentSetup'

function target(dir: string, style: SetupStyle): SetupTarget {
  return { id: 'x', label: 'X', path: join(dir, 'config.json'), detect: dir, style }
}

describe('AgentSetup', () => {
  it('merges into an existing config without touching other servers', () => {
    const dir = mkdtempSync(join(tmpdir(), 'symfoly-'))
    const file = join(dir, 'config.json')
    writeFileSync(file, JSON.stringify({ mcpServers: { other: { command: 'x' } } }))

    const [result] = new AgentSetup([target(dir, 'mcpServers')]).run({
      command: 'node',
      args: ['/mcp.mjs'],
    })
    expect(result.status).toBe('updated')

    const config = JSON.parse(readFileSync(file, 'utf8'))
    expect(config.mcpServers.other).toEqual({ command: 'x' })
    expect(config.mcpServers.symfoly).toEqual({
      command: 'node',
      args: ['/mcp.mjs'],
      env: { SYMFOLY_NAME: 'x' },
    })
  })

  it('creates an OpenCode config when the agent is present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'symfoly-'))
    const [result] = new AgentSetup([target(dir, 'opencode')]).run({
      command: 'node',
      args: ['/mcp.mjs'],
    })
    expect(result.status).toBe('created')

    const config = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'))
    expect(config.mcp.servers.symfoly.type).toBe('local')
    expect(config.mcp.servers.symfoly.command).toEqual(['node', '/mcp.mjs'])
    expect(config.mcp.servers.symfoly.environment).toEqual({ SYMFOLY_NAME: 'x' })
  })

  it('skips when the agent is not installed', () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'symfoly-')), 'missing')
    const [result] = new AgentSetup([target(dir, 'mcpServers')]).run({ command: 'node', args: [] })
    expect(result.status).toBe('skipped')
  })
})
