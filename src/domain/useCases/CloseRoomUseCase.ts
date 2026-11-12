import type { RoomInfo } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

export class CloseRoomUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(room: string): RoomInfo | undefined {
    return this.rooms.close(room)?.toInfo()
  }
}
