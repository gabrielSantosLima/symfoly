import type { ParticipantInfo, ProtocolMessage, RoomInfo } from '../../shared/protocol'
import type { HubClient, SendOptions } from '../HubClient'

export interface JoinResult {
  room: RoomInfo
  participants: ParticipantInfo[]
}

export interface ReceiveInput {
  room: string
  waitSeconds?: number
}

/**
 * Agent-facing operations built on HubClient. It tracks membership and a
 * per-room read cursor so `receive` returns only new messages; the agent calls
 * tools and never manages the socket or the cursor.
 */
export class SymfolyTools {
  private readonly joined = new Set<string>()
  private readonly cursors = new Map<string, number>()

  constructor(private readonly client: HubClient) {}

  async join(room: string): Promise<JoinResult> {
    const state = await this.client.join(room)
    this.joined.add(room)
    return state
  }

  leave(room: string): { ok: true } {
    this.client.leave(room)
    this.joined.delete(room)
    this.cursors.delete(room)
    return { ok: true }
  }

  async send(options: SendOptions): Promise<{ ok: true }> {
    if (!this.joined.has(options.room)) await this.join(options.room)
    this.client.send(options)
    return { ok: true }
  }

  async receive({ room, waitSeconds }: ReceiveInput): Promise<ProtocolMessage[]> {
    if (!this.joined.has(room)) await this.join(room)
    const since = this.cursors.get(room) ?? 0
    const messages = await this.client.receive({ room, since, wait: waitSeconds ?? 30 })
    for (const message of messages) {
      if (message.seq > (this.cursors.get(room) ?? 0)) this.cursors.set(room, message.seq)
    }
    return messages
  }

  listRooms(): Promise<RoomInfo[]> {
    return this.client.rooms()
  }
}
