import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SetupResult } from './AgentSetup'
import type { SkillTarget } from './agentTargets'

/** Copies Symfoly's skills into each installed agent's skills folder. */
export class SkillSetup {
  constructor(private readonly targets: SkillTarget[]) {}

  run(sourceDir: string): SetupResult[] {
    return this.targets.map((target) => this.apply(target, sourceDir))
  }

  private apply(target: SkillTarget, sourceDir: string): SetupResult {
    const base = { id: target.id, label: target.label, path: target.dir }
    if (!existsSync(target.detect)) {
      return { ...base, status: 'skipped', message: 'agent not found' }
    }
    if (!existsSync(sourceDir)) {
      return { ...base, status: 'skipped', message: 'skills missing' }
    }

    const skills = readdirSync(sourceDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    let copied = 0
    for (const skill of skills) {
      const source = join(sourceDir, skill, 'SKILL.md')
      if (!existsSync(source)) continue
      const body = readFileSync(source)
      const destinationDir = join(target.dir, skill)
      const destination = join(destinationDir, 'SKILL.md')
      if (existsSync(destination) && readFileSync(destination).equals(body)) continue
      mkdirSync(destinationDir, { recursive: true })
      writeFileSync(destination, body)
      copied += 1
    }

    return {
      ...base,
      status: copied > 0 ? 'updated' : 'unchanged',
      message: `${skills.length} skill(s)`,
    }
  }
}
