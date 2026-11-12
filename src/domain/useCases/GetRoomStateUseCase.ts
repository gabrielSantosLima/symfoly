import type { ParticipantInfo, RoomInfo, TaskInfo } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

export interface RoomState {
  room: RoomInfo
  participants: ParticipantInfo[]
  tasks: TaskInfo[]
  lastSeq: number
}

/** Compact re-sync snapshot so an agent can refresh before acting. */
export class GetRoomStateUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(room: string): RoomState | undefined {
    const entity = this.rooms.get(room)
    if (!entity) return undefined
    const messages = this.rooms.history(room)
    const lastSeq = messages.length ? (messages[messages.length - 1]?.seq ?? 0) : 0
    return {
      room: entity.toInfo(),
      participants: this.rooms.participantsOf(room),
      tasks: this.rooms.listTasks(room),
      lastSeq,
    }
  }
}
