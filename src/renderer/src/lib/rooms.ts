import type { RoomInfo } from '../../../shared/protocol'

export type BadgeTone = 'open' | 'closed' | 'paused' | 'neutral'

export function roomTone(room: RoomInfo): BadgeTone {
  if (room.status === 'closed') return 'closed'
  if (room.paused) return 'paused'
  return 'open'
}

export function roomLabel(room: RoomInfo): string {
  if (room.status === 'closed') return 'closed'
  if (room.paused) return 'paused'
  return 'open'
}
