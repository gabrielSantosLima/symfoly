// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SkillSetup } from './SkillSetup'

function makeSource(): string {
  const dir = mkdtempSync(join(tmpdir(), 'symfoly-src-'))
  for (const name of ['symfoly-join', 'symfoly-send']) {
    mkdirSync(join(dir, name), { recursive: true })
    writeFileSync(join(dir, name, 'SKILL.md'), `# ${name}\n`)
  }
  return dir
}

describe('SkillSetup', () => {
  it('copies the skills into a detected agent and is idempotent', () => {
    const source = makeSource()
    const base = mkdtempSync(join(tmpdir(), 'symfoly-agent-'))
    const skillsDir = join(base, 'skills')
    const setup = new SkillSetup([{ id: 'a', label: 'A', dir: skillsDir, detect: base }])

    expect(setup.run(source)[0]?.status).toBe('updated')
    expect(existsSync(join(skillsDir, 'symfoly-join', 'SKILL.md'))).toBe(true)
    expect(setup.run(source)[0]?.status).toBe('unchanged')
  })

  it('skips an agent that is not installed', () => {
    const source = makeSource()
    const setup = new SkillSetup([
      {
        id: 'a',
        label: 'A',
        dir: join(tmpdir(), 'symfoly-nope-skills'),
        detect: join(tmpdir(), 'symfoly-definitely-missing'),
      },
    ])
    expect(setup.run(source)[0]?.status).toBe('skipped')
  })
})
