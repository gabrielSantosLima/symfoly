import type { MessageKind, ProtocolMessage } from '../../shared/protocol'
import { DomainError } from '../DomainError'
import type { RoomStore } from '../services/RoomStore'

export interface SendMessageInput {
  room: string
  senderId: string
  senderName: string
  text: string
  kind?: MessageKind
  to?: string
  ref?: string
  expectsReply?: boolean
  done?: boolean
}

const MAX_TEXT_LENGTH = 100_000

export class SendMessageUseCase {
  constructor(private readonly rooms: RoomStore) {}

  execute(input: SendMessageInput): ProtocolMessage {
    const room = this.rooms.get(input.room)
    if (!room || !this.rooms.isParticipant(input.room, input.senderId)) {
      throw new DomainError('not_joined', `not a participant of room ${input.room}`)
    }
    if (!room.isOpen) throw new DomainError('room_closed', `room ${input.room} is closed`)
    if (
      typeof input.text !== 'string' ||
      input.text.length === 0 ||
      input.text.length > MAX_TEXT_LENGTH
    ) {
      throw new DomainError('bad_request', 'text is empty or too long')
    }
    return this.rooms
      .append(input.room, {
        senderId: input.senderId,
        senderName: input.senderName,
        text: input.text,
        kind: input.kind,
        to: input.to,
        ref: input.ref,
        expectsReply: input.expectsReply,
        done: input.done,
      })
      .toProtocol()
  }
}
