import type { RoomInfo } from '../../shared/protocol'
import type { CreateRoomInput } from '../entities/Room'
import type { RoomStore } from '../services/RoomStore'

export class CreateRoomUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(input: CreateRoomInput): RoomInfo {
    return this.rooms.create(input).toInfo()
  }
}
