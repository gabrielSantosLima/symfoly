import { homedir } from 'node:os'
import { join } from 'node:path'

/** Base folder for Symfoly's on-disk state (`SYMFOLY_HOME` overrides). */
export function symfolyHome(): string {
  return process.env.SYMFOLY_HOME ?? join(homedir(), '.symfoly')
}
