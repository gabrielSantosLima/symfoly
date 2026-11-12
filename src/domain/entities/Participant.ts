import { randomUUID } from 'node:crypto'
import type { ParticipantInfo, ParticipantKind } from '../../shared/protocol'

export interface JoinRoomParticipantInput {
  sessionId: string
  name: string
  kind: ParticipantKind
}

export class Participant {
  private constructor(
    readonly id: string,
    readonly sessionId: string,
    readonly name: string,
    readonly kind: ParticipantKind,
    readonly joinedAt: number,
  ) {}

  static create(input: JoinRoomParticipantInput, now = Date.now()): Participant {
    return new Participant(randomUUID(), input.sessionId, input.name, input.kind, now)
  }

  toInfo(): ParticipantInfo {
    return {
      id: this.id,
      name: this.name,
      kind: this.kind,
      sessionId: this.sessionId,
      joinedAt: this.joinedAt,
    }
  }
}
