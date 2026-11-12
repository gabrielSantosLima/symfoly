import type { ParticipantInfo, ProtocolMessage, RoomInfo } from '../../shared/protocol'
import { Message, type NewMessage } from '../entities/Message'
import { Participant, type JoinRoomParticipantInput } from '../entities/Participant'
import { Room, type CreateRoomInput } from '../entities/Room'

/**
 * In-memory room state. Rooms are keyed by name (id === name for now). This is
 * the only place that owns live state; use cases orchestrate it.
 */
export class RoomStore {
  private readonly rooms = new Map<string, Room>()
  private readonly participants = new Map<string, Participant[]>()
  private readonly messages = new Map<string, Message[]>()
  private readonly counters = new Map<string, number>()

  create(input: CreateRoomInput): Room {
    const existing = this.rooms.get(input.name)
    if (existing) return existing
    const room = Room.create(input)
    this.rooms.set(input.name, room)
    this.participants.set(input.name, [])
    this.messages.set(input.name, [])
    this.counters.set(input.name, 0)
    return room
  }

  get(name: string): Room | undefined {
    return this.rooms.get(name)
  }

  list(): RoomInfo[] {
    return [...this.rooms.values()].map((room) => room.toInfo())
  }

  participantsOf(name: string): ParticipantInfo[] {
    return (this.participants.get(name) ?? []).map((participant) => participant.toInfo())
  }

  isParticipant(name: string, sessionId: string): boolean {
    return (this.participants.get(name) ?? []).some((p) => p.sessionId === sessionId)
  }

  join(name: string, input: JoinRoomParticipantInput): Participant {
    const list = this.participants.get(name)
    if (!list) throw new Error(`room not found: ${name}`)
    const existing = list.find((p) => p.sessionId === input.sessionId)
    if (existing) return existing
    const participant = Participant.create(input)
    list.push(participant)
    return participant
  }

  leave(name: string, sessionId: string): void {
    const list = this.participants.get(name)
    if (!list) return
    const index = list.findIndex((p) => p.sessionId === sessionId)
    if (index >= 0) list.splice(index, 1)
  }

  close(name: string): Room | undefined {
    const room = this.rooms.get(name)
    room?.close()
    return room
  }

  append(name: string, input: Omit<NewMessage, 'room'>): Message {
    const room = this.rooms.get(name)
    if (!room) throw new Error(`room not found: ${name}`)
    const seq = (this.counters.get(name) ?? 0) + 1
    this.counters.set(name, seq)
    const message = Message.create(seq, { ...input, room: name })
    this.messages.get(name)?.push(message)
    return message
  }

  history(name: string, since = 0, excludeSender?: string): ProtocolMessage[] {
    return (this.messages.get(name) ?? [])
      .filter((message) => message.seq > since && message.senderId !== excludeSender)
      .map((message) => message.toProtocol())
  }
}
