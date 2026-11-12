import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { WebSocketServer, WebSocket } from 'ws'
import type {
  ClientMessage,
  HubMessage,
  ParticipantKind,
  ProtocolMessage,
} from '../../shared/protocol'
import { DomainError } from '../DomainError'
import type { CloseRoomUseCase } from '../useCases/CloseRoomUseCase'
import type { JoinRoomUseCase } from '../useCases/JoinRoomUseCase'
import type { LeaveRoomUseCase } from '../useCases/LeaveRoomUseCase'
import type { ListRoomsUseCase } from '../useCases/ListRoomsUseCase'
import type { ReceiveMessagesUseCase } from '../useCases/ReceiveMessagesUseCase'
import type { SendMessageUseCase } from '../useCases/SendMessageUseCase'
import type { SetRoomPausedUseCase } from '../useCases/SetRoomPausedUseCase'
import type { GetRoomStateUseCase } from '../useCases/GetRoomStateUseCase'
import type { TaskUseCase } from '../useCases/TaskUseCase'

export interface HubServerDependencies {
  joinRoom: JoinRoomUseCase
  leaveRoom: LeaveRoomUseCase
  sendMessage: SendMessageUseCase
  receiveMessages: ReceiveMessagesUseCase
  listRooms: ListRoomsUseCase
  closeRoom: CloseRoomUseCase
  setRoomPaused: SetRoomPausedUseCase
  task: TaskUseCase
  getRoomState: GetRoomStateUseCase
}

export interface HubServerOptions {
  token: string
  /** 0 (default) lets the OS pick a free port. */
  port?: number
}

export interface PresenceEvent {
  room: string
  name: string
  status: 'joined' | 'left'
}

/** Observability hooks for embedding hosts (for example the Electron main). */
export interface HubEvents {
  message: (message: ProtocolMessage) => void
  presence: (event: PresenceEvent) => void
  closed: (room: string) => void
  rooms: () => void
  task: (room: string) => void
}

export interface HubHandle {
  port: number
  token: string
  on<K extends keyof HubEvents>(event: K, listener: HubEvents[K]): void
  closeRoom(room: string): void
  setRoomPaused(room: string, paused: boolean): void
  close(): Promise<void>
}

interface Waiter {
  requestId: string
  /** null means "every room the session has joined". */
  room: string | null
  since: number
  pending: ProtocolMessage[]
  timer: NodeJS.Timeout
}

interface Session {
  id: string
  name: string | null
  kind: ParticipantKind | null
  ready: boolean
  socket: WebSocket
  rooms: Set<string>
  waiter: Waiter | null
}

const MAX_WAIT_SECONDS = 300

/**
 * Transport layer: WebSocket server on 127.0.0.1 that translates client
 * messages into domain use cases and fans out events. It keeps only transport
 * state (sockets, joined-room sets, pending long-polls); all room state lives in
 * the use cases / RoomStore.
 */
export function createHubServer(
  dependencies: HubServerDependencies,
  options: HubServerOptions,
): Promise<HubHandle> {
  const sessions = new Map<string, Session>()
  const emitter = new EventEmitter()
  const wss = new WebSocketServer({ host: '127.0.0.1', port: options.port ?? 0 })

  function notify<K extends keyof HubEvents>(event: K, ...args: Parameters<HubEvents[K]>): void {
    emitter.emit(event, ...args)
  }

  function send(socket: WebSocket, message: HubMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  function fail(socket: WebSocket, code: string, message: string): void {
    send(socket, { type: 'error', code, message })
  }

  function sessionsIn(room: string): Session[] {
    return [...sessions.values()].filter((session) => session.rooms.has(room))
  }

  function broadcast(room: string, message: HubMessage, except?: Session): void {
    for (const session of sessionsIn(room)) {
      if (session !== except) send(session.socket, message)
    }
  }

  function announcePresence(
    room: string,
    name: string,
    status: 'joined' | 'left',
    except?: Session,
  ): void {
    broadcast(room, { type: 'presence', room, name, status }, except)
    notify('presence', { room, name, status })
  }

  function resolveWaiter(session: Session): void {
    const waiter = session.waiter
    if (!waiter) return
    clearTimeout(waiter.timer)
    session.waiter = null
    send(session.socket, {
      type: 'received',
      requestId: waiter.requestId,
      messages: waiter.pending,
    })
  }

  function deliver(message: ProtocolMessage): void {
    for (const session of sessions.values()) {
      const waiter = session.waiter
      if (!waiter) continue
      if (message.senderId === session.id) continue
      if (waiter.room !== null && waiter.room !== message.room) continue
      if (waiter.room === null && !session.rooms.has(message.room)) continue
      if (message.seq <= waiter.since) continue
      waiter.pending.push(message)
      resolveWaiter(session)
    }
  }

  function handle(session: Session, message: ClientMessage): void {
    const socket = session.socket

    if (!session.ready) {
      if (message.type !== 'hello' || message.token !== options.token) {
        fail(socket, 'unauthorized', 'send hello with a valid token first')
        socket.close()
        return
      }
      session.name = message.name
      session.kind = message.kind
      session.ready = true
      send(socket, {
        type: 'welcome',
        sessionId: session.id,
        name: message.name,
        kind: message.kind,
      })
      return
    }

    try {
      switch (message.type) {
        case 'hello':
          fail(socket, 'bad_request', 'already greeted')
          return

        case 'join': {
          const result = dependencies.joinRoom.execute({
            room: message.room,
            sessionId: session.id,
            name: session.name ?? 'agent',
            kind: session.kind ?? 'agent',
          })
          session.rooms.add(message.room)
          send(socket, { type: 'room_state', room: result.room, participants: result.participants })
          announcePresence(message.room, session.name ?? 'agent', 'joined', session)
          notify('rooms')
          return
        }

        case 'leave': {
          dependencies.leaveRoom.execute(message.room, session.id)
          session.rooms.delete(message.room)
          announcePresence(message.room, session.name ?? 'agent', 'left', session)
          return
        }

        case 'send': {
          const stored = dependencies.sendMessage.execute({
            room: message.room,
            senderId: session.id,
            senderName: session.name ?? 'agent',
            text: message.text,
            kind: message.kind,
            to: message.to,
            ref: message.ref,
            expectsReply: message.expectsReply,
            done: message.done,
          })
          broadcast(message.room, { type: 'message', message: stored })
          notify('message', stored)
          deliver(stored)
          return
        }

        case 'receive': {
          const room = message.all ? null : (message.room ?? null)
          if (room !== null && !session.rooms.has(room)) {
            fail(socket, 'not_joined', room)
            return
          }
          const since = message.since ?? 0
          const scope = room === null ? [...session.rooms] : [room]
          const collected = dependencies.receiveMessages.execute({
            rooms: scope,
            since,
            excludeSender: session.id,
          })
          if (collected.length > 0) {
            send(socket, {
              type: 'received',
              requestId: message.requestId,
              messages: collected,
            })
            return
          }
          if (session.waiter) resolveWaiter(session)
          const waitMs = Math.max(0, Math.min(message.wait ?? 30, MAX_WAIT_SECONDS)) * 1000
          session.waiter = {
            requestId: message.requestId,
            room,
            since,
            pending: [],
            timer: setTimeout(() => resolveWaiter(session), waitMs),
          }
          return
        }

        case 'rooms':
          send(socket, { type: 'rooms', rooms: dependencies.listRooms.execute() })
          return

        case 'task': {
          if (!session.rooms.has(message.room)) {
            fail(socket, 'not_joined', message.room)
            return
          }
          const result = dependencies.task.execute({
            room: message.room,
            action: message.action,
            actor: session.name ?? 'agent',
            id: message.id,
            title: message.title,
            deps: message.deps,
            ttlSeconds: message.ttlSeconds,
            result: message.result,
          })
          send(socket, { type: 'tasks', room: message.room, tasks: result.tasks })
          notify('task', message.room)
          return
        }

        case 'state': {
          if (!session.rooms.has(message.room)) {
            fail(socket, 'not_joined', message.room)
            return
          }
          const state = dependencies.getRoomState.execute(message.room)
          if (!state) {
            fail(socket, 'not_found', message.room)
            return
          }
          send(socket, { type: 'state', ...state })
          return
        }

        case 'ping':
          send(socket, { type: 'pong' })
          return
      }
    } catch (error) {
      if (error instanceof DomainError) {
        fail(socket, error.code, error.message)
      } else {
        fail(socket, 'internal', 'unexpected error')
      }
    }
  }

  wss.on('connection', (socket) => {
    const session: Session = {
      id: randomUUID(),
      name: null,
      kind: null,
      ready: false,
      socket,
      rooms: new Set(),
      waiter: null,
    }
    sessions.set(session.id, session)

    socket.on('message', (data) => {
      let parsed: ClientMessage
      try {
        parsed = JSON.parse(data.toString()) as ClientMessage
      } catch {
        fail(socket, 'bad_request', 'invalid JSON')
        return
      }
      handle(session, parsed)
    })

    socket.on('close', () => {
      if (session.waiter) {
        clearTimeout(session.waiter.timer)
        session.waiter = null
      }
      for (const room of session.rooms) {
        dependencies.leaveRoom.execute(room, session.id)
        announcePresence(room, session.name ?? 'unknown', 'left', session)
      }
      sessions.delete(session.id)
    })
  })

  return new Promise((resolve) => {
    wss.on('listening', () => {
      const address = wss.address()
      const port = typeof address === 'object' && address ? address.port : (options.port ?? 0)
      resolve({
        port,
        token: options.token,
        on: (event, listener) => {
          emitter.on(event, listener)
        },
        closeRoom: (room: string) => {
          const closed = dependencies.closeRoom.execute(room)
          if (!closed) return
          broadcast(room, { type: 'closed', room })
          notify('closed', room)
          notify('rooms')
        },
        setRoomPaused: (room: string, paused: boolean) => {
          const result = dependencies.setRoomPaused.execute(room, paused)
          if (!result) return
          broadcast(room, { type: 'message', message: result.message })
          notify('message', result.message)
          notify('rooms')
        },
        close: () =>
          new Promise<void>((done) => {
            for (const session of sessions.values()) session.socket.terminate()
            sessions.clear()
            wss.close(() => done())
          }),
      })
    })
  })
}
