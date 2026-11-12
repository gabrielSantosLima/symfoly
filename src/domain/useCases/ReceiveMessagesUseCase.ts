import type { ProtocolMessage } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

export interface ReceiveMessagesInput {
  rooms: string[]
  since?: number
  excludeSender?: string
}

export class ReceiveMessagesUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute({ rooms, since = 0, excludeSender }: ReceiveMessagesInput): ProtocolMessage[] {
    const result: ProtocolMessage[] = []
    for (const room of rooms) result.push(...this.rooms.history(room, since, excludeSender))
    return result
  }
}
