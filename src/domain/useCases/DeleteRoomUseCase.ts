import type { RoomStore } from '../services/RoomStore'

export class DeleteRoomUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(room: string): boolean {
    return this.rooms.delete(room)
  }
}
