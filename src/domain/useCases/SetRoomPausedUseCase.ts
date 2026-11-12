import type { ProtocolMessage, RoomInfo } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

export interface SetRoomPausedResult {
  room: RoomInfo
  message: ProtocolMessage
}

export class SetRoomPausedUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(room: string, paused: boolean): SetRoomPausedResult | undefined {
    const entity = this.rooms.get(room)
    if (!entity) return undefined
    entity.setPaused(paused)
    const message = this.rooms.appendSystem(
      room,
      paused ? 'room paused by the human' : 'room resumed by the human',
    )
    return { room: entity.toInfo(), message: message.toProtocol() }
  }
}
