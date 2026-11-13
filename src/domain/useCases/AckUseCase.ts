import type { AckInfo, ProtocolMessage } from '../../shared/protocol'
import type { RoomStore } from '../services/RoomStore'

const DEFAULT_DEADLINE_SECONDS = 60
const MIN_DEADLINE_SECONDS = 1
const MAX_DEADLINE_SECONDS = 3600

export interface CaptureAckInput {
  id: string
  from: string
  to: string
  deadlineSeconds?: number
}

/**
 * Tracks messages that expect a reply (`expectsReply`) until the addressee
 * answers or the deadline passes. Expiry records a system message so the human
 * and the other agents see the escalation.
 */
export class AckUseCase {
  constructor(private readonly rooms: RoomStore) {}

  capture(room: string, input: CaptureAckInput): AckInfo {
    const seconds = Math.min(
      MAX_DEADLINE_SECONDS,
      Math.max(MIN_DEADLINE_SECONDS, input.deadlineSeconds ?? DEFAULT_DEADLINE_SECONDS),
    )
    return this.rooms.addAck(room, {
      id: input.id,
      from: input.from,
      to: input.to,
      deadlineAt: Date.now() + seconds * 1000,
    })
  }

  resolve(room: string, responder: string): boolean {
    return this.rooms.resolveAcks(room, responder)
  }

  list(room: string): AckInfo[] {
    return this.rooms.listAcks(room)
  }

  /** Expires overdue acks, recording a system message for each. */
  expire(now = Date.now()): ProtocolMessage[] {
    const messages: ProtocolMessage[] = []
    for (const { room, ack } of this.rooms.expireAcks(now)) {
      const seconds = Math.round((ack.deadlineAt - ack.createdAt) / 1000)
      const message = this.rooms.appendSystem(
        room,
        `no reply from ${ack.to} to ${ack.from} after ${seconds}s`,
      )
      messages.push(message.toProtocol())
    }
    return messages
  }
}
