// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runDiagnostics } from './Diagnostics'

describe('runDiagnostics', () => {
  it('reports a configured agent and installed skills', () => {
    const base = mkdtempSync(join(tmpdir(), 'symfoly-diag-'))
    const config = join(base, 'claude_desktop_config.json')
    writeFileSync(config, JSON.stringify({ mcpServers: { symfoly: { command: 'x' } } }))
    const skillsDir = join(base, 'skills')
    mkdirSync(join(skillsDir, 'symfoly-join'), { recursive: true })

    const report = runDiagnostics({
      endpointFile: join(base, 'endpoint.json'),
      endpointPresent: true,
      port: 1234,
      hubUrl: 'ws://127.0.0.1:1234',
      agentTargets: [
        {
          id: 'claude-desktop',
          label: 'Claude Desktop',
          path: config,
          detect: base,
          style: 'mcpServers',
        },
      ],
      skillTargets: [{ id: 'opencode', label: 'OpenCode', dir: skillsDir, detect: base }],
    })

    expect(report.endpointPresent).toBe(true)
    expect(report.agents[0]?.detected).toBe(true)
    expect(report.agents[0]?.configured).toBe(true)
    expect(report.skills[0]?.installed).toBe(true)
  })

  it('reports an unconfigured agent', () => {
    const base = mkdtempSync(join(tmpdir(), 'symfoly-diag-'))
    const config = join(base, 'config.json')
    writeFileSync(config, JSON.stringify({ mcpServers: {} }))

    const report = runDiagnostics({
      endpointFile: join(base, 'endpoint.json'),
      endpointPresent: false,
      port: 1,
      hubUrl: 'ws://127.0.0.1:1',
      agentTargets: [{ id: 'x', label: 'X', path: config, detect: base, style: 'mcpServers' }],
      skillTargets: [],
    })

    expect(report.agents[0]?.configured).toBe(false)
    expect(report.endpointPresent).toBe(false)
  })
})
