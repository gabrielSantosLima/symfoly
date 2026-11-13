import type { RoomInfo } from '../../../shared/protocol'

export type RoomTone = 'working' | 'attention' | 'neutral'

export function roomTone(room: RoomInfo): RoomTone {
  if (room.status === 'closed') return 'neutral'
  if (room.paused) return 'attention'
  return 'working'
}

export function roomLabel(room: RoomInfo): string {
  if (room.status === 'closed') return 'closed'
  if (room.paused) return 'paused'
  return 'open'
}
