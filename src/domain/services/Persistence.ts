import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ParticipantInfo, ProtocolMessage, RoomInfo } from '../../shared/protocol'
import { symfolyHome } from './paths'

export interface RoomSnapshot {
  room: RoomInfo
  participants: ParticipantInfo[]
  messages: ProtocolMessage[]
}

export interface Snapshot {
  rooms: RoomSnapshot[]
}

export function defaultStorePath(channel = process.env.SYMFOLY_CHANNEL ?? 'production'): string {
  const suffix = channel === 'production' ? '' : `-${channel}`
  return join(symfolyHome(), `store${suffix}.json`)
}

/**
 * Persists a whole-store snapshot to a JSON file (atomic write via a temp file).
 * `schedule` debounces writes; `flush` forces one on shutdown.
 */
export class Persistence {
  private pending: NodeJS.Timeout | undefined
  private latest: Snapshot | undefined

  constructor(
    private readonly filePath: string,
    private readonly delayMs = 500,
  ) {}

  load(): Snapshot | undefined {
    if (!existsSync(this.filePath)) return undefined
    try {
      const data = JSON.parse(readFileSync(this.filePath, 'utf8')) as Partial<Snapshot>
      if (Array.isArray(data.rooms)) return { rooms: data.rooms }
    } catch {
      /* ignore a corrupt file */
    }
    return undefined
  }

  schedule(snapshot: Snapshot): void {
    this.latest = snapshot
    if (this.pending) return
    this.pending = setTimeout(() => {
      this.pending = undefined
      if (this.latest) this.save(this.latest)
    }, this.delayMs)
  }

  flush(): void {
    if (this.pending) {
      clearTimeout(this.pending)
      this.pending = undefined
    }
    if (this.latest) this.save(this.latest)
  }

  save(snapshot: Snapshot): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    writeFileSync(temp, `${JSON.stringify(snapshot)}\n`)
    renameSync(temp, this.filePath)
  }

  clear(): void {
    rmSync(this.filePath, { force: true })
  }
}
