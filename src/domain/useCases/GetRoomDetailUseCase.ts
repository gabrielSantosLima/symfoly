import type { RoomDetail } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'
import type { ReceiveMessagesUseCase } from './ReceiveMessagesUseCase'

export class GetRoomDetailUseCase {
  constructor(
    private readonly rooms: RoomStore,
    private readonly receive: ReceiveMessagesUseCase,
  ) {}

  execute(room: string): RoomDetail | undefined {
    const entity = this.rooms.get(room)
    if (!entity) return undefined
    return {
      room: entity.toInfo(),
      participants: this.rooms.participantsOf(room),
      messages: this.receive.execute({ rooms: [room] }),
      tasks: this.rooms.listTasks(room),
      acks: this.rooms.listAcks(room),
      floor: this.rooms.floorOf(room),
      metrics: this.rooms.metricsOf(room),
    }
  }
}
