import { WebSocket } from 'ws'
import type {
  AckInfo,
  ClientMessage,
  FloorInfo,
  HubMessage,
  MessageKind,
  ParticipantInfo,
  ParticipantKind,
  ProtocolMessage,
  RoomInfo,
  RoomPhase,
  TaskInfo,
} from '../shared/protocol'

export interface HubClientOptions {
  url: string
  token: string
  name: string
  kind?: ParticipantKind
}

export interface RoomState {
  room: RoomInfo
  participants: ParticipantInfo[]
}

export interface SendOptions {
  room: string
  text: string
  to?: string
  kind?: MessageKind
  ref?: string
  expectsReply?: boolean
  done?: boolean
  deadlineSeconds?: number
}

export interface ReceiveOptions {
  room?: string
  all?: boolean
  since?: number
  wait?: number
}

export interface TaskRequest {
  room: string
  action: 'discover' | 'claim' | 'renew' | 'release' | 'complete' | 'verify'
  id?: string
  title?: string
  deps?: string[]
  ttlSeconds?: number
  result?: string
}

export interface RoomStateResult {
  room: RoomInfo
  participants: ParticipantInfo[]
  tasks: TaskInfo[]
  acks: AckInfo[]
  floor: FloorInfo
  lastSeq: number
}

type PresenceEvent = Extract<HubMessage, { type: 'presence' }>
type Handler<T> = (payload: T) => void
type Unsubscribe = () => void

/** Error returned by the hub, carrying its code (already_claimed, paused, ...). */
export class HubError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HubError'
  }
}

interface Waiter {
  match: (message: HubMessage) => boolean
  resolve: (message: HubMessage) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

/**
 * JSON WebSocket client for the Symfoly hub. Shared by the CLI and (later) the
 * MCP bridge. Request/response messages are awaited by predicate; events
 * (message/presence/closed) are dispatched to handlers.
 */
export class HubClient {
  private readonly inbox: HubMessage[] = []
  private readonly waiters: Waiter[] = []
  private readonly messageHandlers = new Set<Handler<ProtocolMessage>>()
  private readonly presenceHandlers = new Set<Handler<PresenceEvent>>()
  private readonly closedHandlers = new Set<Handler<string>>()
  private counter = 0
  private isClosed = false

  private constructor(private readonly ws: WebSocket) {
    ws.on('message', (data) => this.dispatch(JSON.parse(data.toString()) as HubMessage))
    ws.on('close', () => {
      this.isClosed = true
      for (const waiter of this.waiters.splice(0)) {
        clearTimeout(waiter.timer)
        waiter.reject(new Error('connection closed'))
      }
    })
  }

  static connect(options: HubClientOptions): Promise<HubClient> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(options.url)
      const client = new HubClient(socket)
      socket.once('error', reject)
      socket.once('open', () => {
        client.sendRaw({
          type: 'hello',
          token: options.token,
          name: options.name,
          kind: options.kind ?? 'agent',
        })
        client
          .waitFor((message) => message.type === 'welcome' || message.type === 'error', 5000)
          .then((message) => {
            if (message.type === 'error') reject(new Error(`hub error: ${message.message}`))
            else resolve(client)
          })
          .catch(reject)
      })
    })
  }

  join(room: string): Promise<RoomState> {
    this.sendRaw({ type: 'join', room })
    return this.waitFor(
      (message) => message.type === 'room_state' && message.room.name === room,
      5000,
    ).then((message) => {
      const state = message as Extract<HubMessage, { type: 'room_state' }>
      return { room: state.room, participants: state.participants }
    })
  }

  leave(room: string): void {
    this.sendRaw({ type: 'leave', room })
  }

  delete(room: string): void {
    this.sendRaw({ type: 'delete', room })
  }

  send(options: SendOptions): void {
    this.sendRaw({ type: 'send', ...options })
  }

  receive(options: ReceiveOptions): Promise<ProtocolMessage[]> {
    const requestId = `req-${++this.counter}`
    this.sendRaw({ type: 'receive', requestId, ...options })
    const timeout = (options.wait ?? 30) * 1000 + 2000
    return this.waitFor(
      (message) => message.type === 'received' && message.requestId === requestId,
      timeout,
    ).then((message) => (message as Extract<HubMessage, { type: 'received' }>).messages)
  }

  rooms(): Promise<RoomInfo[]> {
    this.sendRaw({ type: 'rooms' })
    return this.waitFor((message) => message.type === 'rooms', 5000).then(
      (message) => (message as Extract<HubMessage, { type: 'rooms' }>).rooms,
    )
  }

  task(input: TaskRequest): Promise<TaskInfo[]> {
    this.sendRaw({ type: 'task', ...input })
    return this.waitFor(
      (message) => message.type === 'tasks' && message.room === input.room,
      5000,
    ).then((message) => (message as Extract<HubMessage, { type: 'tasks' }>).tasks)
  }

  state(room: string): Promise<RoomStateResult> {
    this.sendRaw({ type: 'state', room })
    return this.waitFor(
      (message) => message.type === 'state' && message.room.name === room,
      5000,
    ).then((message) => {
      const state = message as Extract<HubMessage, { type: 'state' }>
      return {
        room: state.room,
        participants: state.participants,
        tasks: state.tasks,
        acks: state.acks,
        floor: state.floor,
        lastSeq: state.lastSeq,
      }
    })
  }

  phase(room: string, action: 'advance' | 'set', value?: RoomPhase): Promise<RoomPhase> {
    this.sendRaw({ type: 'phase', room, action, phase: value })
    return this.waitFor((message) => message.type === 'phase' && message.room === room, 5000).then(
      (message) => (message as Extract<HubMessage, { type: 'phase' }>).phase,
    )
  }

  floor(
    room: string,
    action: 'acquire' | 'renew' | 'release',
    ttlSeconds?: number,
  ): Promise<FloorInfo> {
    this.sendRaw({ type: 'floor', room, action, ttlSeconds })
    return this.waitFor((message) => message.type === 'floor' && message.room === room, 5000).then(
      (message) => (message as Extract<HubMessage, { type: 'floor' }>).floor,
    )
  }

  onMessage(handler: Handler<ProtocolMessage>): Unsubscribe {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onPresence(handler: Handler<PresenceEvent>): Unsubscribe {
    this.presenceHandlers.add(handler)
    return () => this.presenceHandlers.delete(handler)
  }

  onClosed(handler: Handler<string>): Unsubscribe {
    this.closedHandlers.add(handler)
    return () => this.closedHandlers.delete(handler)
  }

  close(): Promise<void> {
    if (this.isClosed || this.ws.readyState === WebSocket.CLOSED) return Promise.resolve()
    return new Promise((resolve) => {
      this.ws.once('close', () => resolve())
      this.ws.close()
    })
  }

  private sendRaw(message: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message))
  }

  private dispatch(message: HubMessage): void {
    if (message.type === 'error') {
      const waiter = this.waiters.shift()
      if (waiter) {
        clearTimeout(waiter.timer)
        waiter.reject(new HubError(message.code, message.message))
        return
      }
      this.inbox.push(message)
      return
    }
    if (message.type === 'message') {
      this.emit(this.messageHandlers, message.message)
      return
    }
    if (message.type === 'presence') {
      this.emit(this.presenceHandlers, message)
      return
    }
    if (message.type === 'closed') {
      this.emit(this.closedHandlers, message.room)
      return
    }
    const index = this.waiters.findIndex((waiter) => waiter.match(message))
    if (index >= 0) {
      const [waiter] = this.waiters.splice(index, 1)
      clearTimeout(waiter.timer)
      waiter.resolve(message)
      return
    }
    this.inbox.push(message)
  }

  private waitFor(match: (message: HubMessage) => boolean, timeoutMs: number): Promise<HubMessage> {
    const index = this.inbox.findIndex(match)
    if (index >= 0) {
      const [message] = this.inbox.splice(index, 1)
      return Promise.resolve(message)
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const at = this.waiters.findIndex((waiter) => waiter.timer === timer)
        if (at >= 0) this.waiters.splice(at, 1)
        reject(new Error('timeout waiting for hub response'))
      }, timeoutMs)
      this.waiters.push({ match, resolve, reject, timer })
    })
  }

  private emit<T>(handlers: Set<Handler<T>>, payload: T): void {
    for (const handler of handlers) handler(payload)
  }
}
