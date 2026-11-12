import type { ParticipantInfo, ProtocolMessage, RoomInfo } from '../../shared/protocol'
import { Message, type NewMessage } from '../entities/Message'
import { Participant, type JoinRoomParticipantInput } from '../entities/Participant'
import { Room, type CreateRoomInput } from '../entities/Room'
import type { Snapshot } from './Persistence'

/**
 * In-memory room state. Rooms are keyed by name (id === name for now). This is
 * the only place that owns live state; use cases orchestrate it. Persistence is
 * write-behind: `onChange` listeners receive a ping and take a snapshot.
 */
export class RoomStore {
  private readonly rooms = new Map<string, Room>()
  private readonly participants = new Map<string, Participant[]>()
  private readonly messages = new Map<string, Message[]>()
  private readonly counters = new Map<string, number>()
  private readonly listeners = new Set<() => void>()

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  create(input: CreateRoomInput): Room {
    const existing = this.rooms.get(input.name)
    if (existing) return existing
    const room = Room.create(input)
    this.rooms.set(input.name, room)
    this.participants.set(input.name, [])
    this.messages.set(input.name, [])
    this.counters.set(input.name, 0)
    this.changed()
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
    this.changed()
    return participant
  }

  leave(name: string, sessionId: string): void {
    const list = this.participants.get(name)
    if (!list) return
    const index = list.findIndex((p) => p.sessionId === sessionId)
    if (index >= 0) {
      list.splice(index, 1)
      this.changed()
    }
  }

  close(name: string): Room | undefined {
    const room = this.rooms.get(name)
    if (!room) return undefined
    if (room.isOpen) {
      room.close()
      this.changed()
    }
    return room
  }

  pause(name: string, paused: boolean): Room | undefined {
    const room = this.rooms.get(name)
    if (!room) return undefined
    room.setPaused(paused)
    this.changed()
    return room
  }

  count(name: string): number {
    return (this.messages.get(name) ?? []).length
  }

  append(name: string, input: Omit<NewMessage, 'room'>): Message {
    if (!this.rooms.has(name)) throw new Error(`room not found: ${name}`)
    const message = Message.create(this.nextSeq(name), { ...input, room: name })
    this.messages.get(name)?.push(message)
    this.changed()
    return message
  }

  appendSystem(name: string, text: string): Message {
    if (!this.rooms.has(name)) throw new Error(`room not found: ${name}`)
    const message = Message.system(this.nextSeq(name), name, text)
    this.messages.get(name)?.push(message)
    this.changed()
    return message
  }

  history(name: string, since = 0, excludeSender?: string): ProtocolMessage[] {
    return (this.messages.get(name) ?? [])
      .filter((message) => message.seq > since && message.senderId !== excludeSender)
      .map((message) => message.toProtocol())
  }

  snapshot(): Snapshot {
    return {
      rooms: [...this.rooms.values()].map((room) => ({
        room: room.toInfo(),
        participants: this.participantsOf(room.name),
        messages: (this.messages.get(room.name) ?? []).map((message) => message.toProtocol()),
      })),
    }
  }

  restore(snapshot: Snapshot): void {
    for (const entry of snapshot.rooms) {
      const room = Room.fromInfo(entry.room)
      const messages = entry.messages.map((message) => Message.fromProtocol(message))
      this.rooms.set(room.name, room)
      this.participants.set(
        room.name,
        entry.participants.map((participant) => Participant.fromInfo(participant)),
      )
      this.messages.set(room.name, messages)
      this.counters.set(
        room.name,
        messages.reduce((max, message) => Math.max(max, message.seq), 0),
      )
    }
  }

  private nextSeq(name: string): number {
    const seq = (this.counters.get(name) ?? 0) + 1
    this.counters.set(name, seq)
    return seq
  }

  private changed(): void {
    for (const listener of this.listeners) listener()
  }
}
