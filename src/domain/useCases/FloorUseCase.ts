import type { FloorInfo } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

const DEFAULT_TTL_SECONDS = 120
const MIN_TTL_SECONDS = 1
const MAX_TTL_SECONDS = 3600

function toMs(ttlSeconds?: number): number {
  const seconds = Math.min(
    MAX_TTL_SECONDS,
    Math.max(MIN_TTL_SECONDS, ttlSeconds ?? DEFAULT_TTL_SECONDS),
  )
  return seconds * 1000
}

/** Serializes who may act next: at most one participant holds the floor. */
export class FloorUseCase {
  constructor(private readonly rooms: RoomStore) {}

  acquire(room: string, holder: string, ttlSeconds?: number): FloorInfo {
    return this.rooms.acquireFloor(room, holder, toMs(ttlSeconds))
  }

  renew(room: string, holder: string, ttlSeconds?: number): FloorInfo {
    return this.rooms.renewFloor(room, holder, toMs(ttlSeconds))
  }

  release(room: string, holder: string): FloorInfo {
    return this.rooms.releaseFloor(room, holder)
  }

  list(room: string): FloorInfo {
    return this.rooms.floorOf(room)
  }

  expire(now = Date.now()): string[] {
    return this.rooms.expireFloors(now)
  }
}
