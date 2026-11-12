import type { ParticipantInfo, ParticipantKind, RoomInfo } from '../../shared/protocol'
import { DomainError } from '../DomainError'
import type { RoomStore } from '../services/RoomStore'

export interface JoinRoomInput {
  room: string
  sessionId: string
  name: string
  kind: ParticipantKind
}

export interface JoinRoomResult {
  room: RoomInfo
  participants: ParticipantInfo[]
}

export class JoinRoomUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(input: JoinRoomInput): JoinRoomResult {
    const room =
      this.rooms.get(input.room) ?? this.rooms.create({ name: input.room, createdBy: input.name })
    if (!room.isOpen) throw new DomainError('room_closed', `room ${input.room} is closed`)
    this.rooms.join(input.room, {
      sessionId: input.sessionId,
      name: input.name,
      kind: input.kind,
    })
    return { room: room.toInfo(), participants: this.rooms.participantsOf(input.room) }
  }
}
