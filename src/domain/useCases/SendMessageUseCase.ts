import type { MessageKind, ProtocolMessage } from '../../shared/protocol'
import { DomainError } from '../DomainError'
import { RateLimiter } from '../services/RateLimiter'
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

export interface SendMessagePolicy {
  /** Hard cap on messages in a room (loop guard). */
  maxMessagesPerRoom?: number
  /** Messages a single sender may post per room within the window. */
  rateLimit?: number
  rateWindowMs?: number
}

const MAX_TEXT_LENGTH = 100_000

export class SendMessageUseCase {
  private readonly limiter: RateLimiter
  private readonly policy: Required<SendMessagePolicy>

  constructor(
    private readonly rooms: RoomStore,
    limiter: RateLimiter = new RateLimiter(),
    policy: SendMessagePolicy = {},
  ) {
    this.limiter = limiter
    this.policy = {
      maxMessagesPerRoom: policy.maxMessagesPerRoom ?? 500,
      rateLimit: policy.rateLimit ?? 20,
      rateWindowMs: policy.rateWindowMs ?? 10_000,
    }
  }

  execute(input: SendMessageInput): ProtocolMessage {
    const room = this.rooms.get(input.room)
    if (!room || !this.rooms.isParticipant(input.room, input.senderId)) {
      throw new DomainError('not_joined', `not a participant of room ${input.room}`)
    }
    if (!room.isOpen) throw new DomainError('room_closed', `room ${input.room} is closed`)
    if (room.isPaused) throw new DomainError('paused', `room ${input.room} is paused`)
    if (
      typeof input.text !== 'string' ||
      input.text.length === 0 ||
      input.text.length > MAX_TEXT_LENGTH
    ) {
      throw new DomainError('bad_request', 'text is empty or too long')
    }
    if (this.rooms.count(input.room) >= this.policy.maxMessagesPerRoom) {
      throw new DomainError('room_full', `room ${input.room} reached its message limit`)
    }
    const allowed = this.limiter.check(`${input.room}:${input.senderId}`, {
      limit: this.policy.rateLimit,
      windowMs: this.policy.rateWindowMs,
    })
    if (!allowed) {
      throw new DomainError('rate_limited', `too many messages in room ${input.room}`)
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
