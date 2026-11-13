import type { RoomInfo } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

export class RenameRoomUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(from: string, to: string): RoomInfo | undefined {
    return this.rooms.rename(from, to)?.toInfo()
  }
}
