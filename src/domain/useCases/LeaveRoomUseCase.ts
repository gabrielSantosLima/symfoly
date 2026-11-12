import type { RoomStore } from '../services/RoomStore'

export class LeaveRoomUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(room: string, sessionId: string): void {
    this.rooms.leave(room, sessionId)
  }
}
