import type { ParticipantInfo, ProtocolMessage, RoomInfo, TaskInfo } from '../../shared/protocol'
import { Message, type NewMessage } from '../entities/Message'
import { Participant, type JoinRoomParticipantInput } from '../entities/Participant'
import { Room, type CreateRoomInput } from '../entities/Room'
import { Task, type NewTask } from '../entities/Task'
import { DomainError } from '../DomainError'
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
  private readonly tasks = new Map<string, Task[]>()
  private readonly counters = new Map<string, number>()
  private readonly listeners = new Set<() => void>()
  private retention = 0

  onChange(listener: () => void): void {
    this.listeners.add(listener)
  }

  setRetention(value: number): void {
    this.retention = value
    for (const name of this.rooms.keys()) this.trim(name)
    this.changed()
  }

  create(input: CreateRoomInput): Room {
    const existing = this.rooms.get(input.name)
    if (existing) return existing
    const room = Room.create(input)
    this.rooms.set(input.name, room)
    this.participants.set(input.name, [])
    this.messages.set(input.name, [])
    this.tasks.set(input.name, [])
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

  delete(name: string): boolean {
    if (!this.rooms.has(name)) return false
    this.rooms.delete(name)
    this.participants.delete(name)
    this.messages.delete(name)
    this.tasks.delete(name)
    this.counters.delete(name)
    this.changed()
    return true
  }

  count(name: string): number {
    return (this.messages.get(name) ?? []).length
  }

  append(name: string, input: Omit<NewMessage, 'room'>): Message {
    if (!this.rooms.has(name)) throw new Error(`room not found: ${name}`)
    const message = Message.create(this.nextSeq(name), { ...input, room: name })
    this.messages.get(name)?.push(message)
    this.trim(name)
    this.changed()
    return message
  }

  appendSystem(name: string, text: string): Message {
    if (!this.rooms.has(name)) throw new Error(`room not found: ${name}`)
    const message = Message.system(this.nextSeq(name), name, text)
    this.messages.get(name)?.push(message)
    this.trim(name)
    this.changed()
    return message
  }

  history(name: string, since = 0, excludeSender?: string): ProtocolMessage[] {
    return (this.messages.get(name) ?? [])
      .filter((message) => message.seq > since && message.senderId !== excludeSender)
      .map((message) => message.toProtocol())
  }

  listTasks(name: string): TaskInfo[] {
    this.expireLeases(name)
    return (this.tasks.get(name) ?? []).map((task) => task.toInfo())
  }

  discoverTask(name: string, input: Omit<NewTask, 'room'>): Task {
    const list = this.tasks.get(name)
    if (!list) throw new Error(`room not found: ${name}`)
    const task = Task.create({ ...input, room: name })
    list.push(task)
    this.changed()
    return task
  }

  claimTask(name: string, id: string, owner: string, ttlMs: number): Task {
    const task = this.findTask(name, id)
    this.expireLeases(name)
    const missing = task.deps.filter((dep) => !this.findTask(name, dep).isClosed)
    if (missing.length) {
      throw new DomainError('deps_pending', `blocked by: ${missing.join(', ')}`)
    }
    task.claim(owner, ttlMs)
    this.changed()
    return task
  }

  renewTask(name: string, id: string, owner: string, ttlMs: number): Task {
    const task = this.findTask(name, id)
    task.renew(owner, ttlMs)
    this.changed()
    return task
  }

  releaseTask(name: string, id: string, owner: string): Task {
    const task = this.findTask(name, id)
    task.release(owner)
    this.changed()
    return task
  }

  completeTask(name: string, id: string, owner: string, result?: string): Task {
    const task = this.findTask(name, id)
    task.complete(owner, result)
    this.changed()
    return task
  }

  verifyTask(name: string, id: string, verifier: string): Task {
    const task = this.findTask(name, id)
    task.verify(verifier)
    this.changed()
    return task
  }

  snapshot(): Snapshot {
    return {
      rooms: [...this.rooms.values()].map((room) => ({
        room: room.toInfo(),
        participants: this.participantsOf(room.name),
        messages: (this.messages.get(room.name) ?? []).map((message) => message.toProtocol()),
        tasks: (this.tasks.get(room.name) ?? []).map((task) => task.toInfo()),
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
      this.tasks.set(
        room.name,
        (entry.tasks ?? []).map((task) => Task.fromInfo(task)),
      )
      this.counters.set(
        room.name,
        messages.reduce((max, message) => Math.max(max, message.seq), 0),
      )
    }
  }

  private findTask(name: string, id: string): Task {
    const task = (this.tasks.get(name) ?? []).find((candidate) => candidate.id === id)
    if (!task) throw new DomainError('task_not_found', `task ${id} not found in ${name}`)
    return task
  }

  private expireLeases(name: string): void {
    const now = Date.now()
    let expired = false
    for (const task of this.tasks.get(name) ?? []) {
      if (task.isLeaseExpired(now)) {
        task.expire(now)
        expired = true
      }
    }
    if (expired) this.changed()
  }

  private nextSeq(name: string): number {
    const seq = (this.counters.get(name) ?? 0) + 1
    this.counters.set(name, seq)
    return seq
  }

  private trim(name: string): void {
    if (this.retention <= 0) return
    const list = this.messages.get(name)
    if (!list) return
    while (list.length > this.retention) list.shift()
  }

  private changed(): void {
    for (const listener of this.listeners) listener()
  }
}
