import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { symfolyHome } from './paths'

export interface LauncherSpec {
  command: string
  args: string[]
}

export interface LauncherTargets {
  mcp: LauncherSpec
  cli: LauncherSpec
}

/** Writes stable launch shims so an agent can use a short, fixed path. */
export class Launchers {
  constructor(private readonly dir: string = join(symfolyHome(), 'bin')) {}

  write(targets: LauncherTargets): string {
    mkdirSync(this.dir, { recursive: true })
    writeFileSync(join(this.dir, 'symfoly-mcp.cmd'), cmd(targets.mcp))
    writeFileSync(join(this.dir, 'symfoly.cmd'), cmd(targets.cli))
    writeFileSync(join(this.dir, 'symfoly-mcp'), sh(targets.mcp))
    writeFileSync(join(this.dir, 'symfoly'), sh(targets.cli))
    return this.dir
  }
}

function quoted(spec: LauncherSpec): string {
  return [spec.command, ...spec.args].map((part) => `"${part}"`).join(' ')
}

function cmd(spec: LauncherSpec): string {
  // ELECTRON_RUN_AS_NODE lets the packaged app act as a plain Node.js runtime.
  return `@echo off\r\nset ELECTRON_RUN_AS_NODE=1\r\n${quoted(spec)} %*\r\n`
}

function sh(spec: LauncherSpec): string {
  return `#!/usr/bin/env sh\nELECTRON_RUN_AS_NODE=1 exec ${quoted(spec)} "$@"\n`
}
