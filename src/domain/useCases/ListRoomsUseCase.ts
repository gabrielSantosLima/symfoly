import type { RoomInfo } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

export class ListRoomsUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(): RoomInfo[] {
    return this.rooms.list()
  }
}
