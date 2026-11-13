import type { RoomInfo, RoomPhase, RoomStatus } from '../../shared/protocol'

export interface CreateRoomInput {
  name: string
  brief?: string
  topic?: string
  createdBy: string
}

export class Room {
  private paused = false
  private phase: RoomPhase = 'planning'

  private constructor(
    readonly id: string,
    readonly name: string,
    readonly brief: string | undefined,
    readonly topic: string | undefined,
    readonly createdBy: string,
    readonly createdAt: number,
    private status: RoomStatus,
    private closedOn?: number,
  ) {}

  static create(input: CreateRoomInput, now = Date.now()): Room {
    return new Room(input.name, input.name, input.brief, input.topic, input.createdBy, now, 'open')
  }

  static fromInfo(info: RoomInfo): Room {
    const room = new Room(
      info.id,
      info.name,
      info.brief,
      info.topic,
      info.createdBy,
      info.createdAt,
      info.status,
      info.closedAt,
    )
    room.paused = info.paused ?? false
    room.phase = info.phase ?? 'planning'
    return room
  }

  get isOpen(): boolean {
    return this.status === 'open'
  }

  get isPaused(): boolean {
    return this.paused
  }

  setPaused(value: boolean): void {
    this.paused = value
  }

  setPhase(phase: RoomPhase): void {
    this.phase = phase
  }

  close(now = Date.now()): void {
    if (!this.isOpen) return
    this.status = 'closed'
    this.closedOn = now
  }

  toInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      topic: this.topic,
      brief: this.brief,
      status: this.status,
      phase: this.phase,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      closedAt: this.closedOn,
      paused: this.paused,
    }
  }
}
