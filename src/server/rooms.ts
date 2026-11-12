import { randomUUID } from 'node:crypto'
import type {
  MessageKind,
  ParticipantInfo,
  ParticipantKind,
  ProtocolMessage,
  RoomInfo,
} from '../shared/protocol'

export interface AppendInput {
  senderId: string
  senderName: string
  text: string
  kind?: MessageKind
  to?: string
  ref?: string
  expectsReply?: boolean
  done?: boolean
}

export interface JoinInput {
  sessionId: string
  name: string
  kind: ParticipantKind
}

/**
 * In-memory room state for the M0 hub. Rooms are keyed by name (id === name for
 * now; a separate id can be introduced later without changing the wire shape's
 * `room` field).
 */
export class RoomManager {
  private readonly rooms = new Map<string, RoomInfo>()
  private readonly participants = new Map<string, ParticipantInfo[]>()
  private readonly messages = new Map<string, ProtocolMessage[]>()
  private readonly counters = new Map<string, number>()

  createRoom(
    name: string,
    options: { brief?: string; topic?: string; createdBy: string },
  ): RoomInfo {
    const existing = this.rooms.get(name)
    if (existing) return existing
    const room: RoomInfo = {
      id: name,
      name,
      topic: options.topic,
      brief: options.brief,
      status: 'open',
      createdBy: options.createdBy,
      createdAt: Date.now(),
    }
    this.rooms.set(name, room)
    this.participants.set(name, [])
    this.messages.set(name, [])
    this.counters.set(name, 0)
    return room
  }

  getRoom(name: string): RoomInfo | undefined {
    return this.rooms.get(name)
  }

  listRooms(): RoomInfo[] {
    return [...this.rooms.values()]
  }

  listParticipants(name: string): ParticipantInfo[] {
    return [...(this.participants.get(name) ?? [])]
  }

  isParticipant(name: string, sessionId: string): boolean {
    return (this.participants.get(name) ?? []).some((p) => p.sessionId === sessionId)
  }

  join(name: string, who: JoinInput): ParticipantInfo {
    const list = this.participants.get(name)
    if (!list) throw new Error(`room not found: ${name}`)
    const existing = list.find((p) => p.sessionId === who.sessionId)
    if (existing) return existing
    const participant: ParticipantInfo = {
      id: randomUUID(),
      name: who.name,
      kind: who.kind,
      sessionId: who.sessionId,
      joinedAt: Date.now(),
    }
    list.push(participant)
    return participant
  }

  leave(name: string, sessionId: string): void {
    const list = this.participants.get(name)
    if (!list) return
    const index = list.findIndex((p) => p.sessionId === sessionId)
    if (index >= 0) list.splice(index, 1)
  }

  close(name: string): RoomInfo | undefined {
    const room = this.rooms.get(name)
    if (!room) return undefined
    room.status = 'closed'
    room.closedAt = Date.now()
    return room
  }

  append(name: string, input: AppendInput): ProtocolMessage {
    const room = this.rooms.get(name)
    if (!room) throw new Error(`room not found: ${name}`)
    const seq = (this.counters.get(name) ?? 0) + 1
    this.counters.set(name, seq)
    const message: ProtocolMessage = {
      id: randomUUID(),
      seq,
      room: name,
      senderId: input.senderId,
      senderName: input.senderName,
      kind: input.kind ?? 'chat',
      text: input.text,
      to: input.to,
      ref: input.ref,
      expectsReply: input.expectsReply,
      done: input.done,
      ts: Date.now(),
    }
    this.messages.get(name)?.push(message)
    return message
  }

  history(name: string, since = 0, excludeSender?: string): ProtocolMessage[] {
    return (this.messages.get(name) ?? []).filter(
      (message) => message.seq > since && message.senderId !== excludeSender,
    )
  }
}
