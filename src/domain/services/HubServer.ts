import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { WebSocketServer, WebSocket } from 'ws'
import type {
  ClientMessage,
  HubMessage,
  ParticipantKind,
  ProtocolMessage,
  RoomPhase,
} from '../../shared/protocol'
import { DomainError } from '../DomainError'
import type { CloseRoomUseCase } from '../useCases/CloseRoomUseCase'
import type { DeleteRoomUseCase } from '../useCases/DeleteRoomUseCase'
import type { JoinRoomUseCase } from '../useCases/JoinRoomUseCase'
import type { LeaveRoomUseCase } from '../useCases/LeaveRoomUseCase'
import type { ListRoomsUseCase } from '../useCases/ListRoomsUseCase'
import type { ReceiveMessagesUseCase } from '../useCases/ReceiveMessagesUseCase'
import type { SendMessageUseCase } from '../useCases/SendMessageUseCase'
import type { SetRoomPausedUseCase } from '../useCases/SetRoomPausedUseCase'
import type { GetRoomStateUseCase } from '../useCases/GetRoomStateUseCase'
import type { TaskUseCase } from '../useCases/TaskUseCase'
import type { RenameRoomUseCase } from '../useCases/RenameRoomUseCase'
import type { AckUseCase } from '../useCases/AckUseCase'
import type { PhaseUseCase } from '../useCases/PhaseUseCase'
import type { FloorUseCase } from '../useCases/FloorUseCase'

export interface HubServerDependencies {
  joinRoom: JoinRoomUseCase
  leaveRoom: LeaveRoomUseCase
  sendMessage: SendMessageUseCase
  receiveMessages: ReceiveMessagesUseCase
  listRooms: ListRoomsUseCase
  closeRoom: CloseRoomUseCase
  setRoomPaused: SetRoomPausedUseCase
  deleteRoom: DeleteRoomUseCase
  renameRoom: RenameRoomUseCase
  task: TaskUseCase
  ack: AckUseCase
  phase: PhaseUseCase
  floor: FloorUseCase
  getRoomState: GetRoomStateUseCase
}

export interface HubServerOptions {
  token: string
  /** 0 (default) lets the OS pick a free port. */
  port?: number
  /** How often overdue acks are swept. Defaults to 1000 ms. */
  ackSweepMs?: number
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
  deleted: (room: string) => void
  renamed: (from: string, to: string) => void
  ack: (room: string) => void
  phase: (room: string) => void
  floor: (room: string) => void
}

export interface HubHandle {
  port: number
  token: string
  on<K extends keyof HubEvents>(event: K, listener: HubEvents[K]): void
  closeRoom(room: string): void
  setRoomPaused(room: string, paused: boolean): void
  deleteRoom(room: string): void
  renameRoom(from: string, to: string): void
  setRoomPhase(room: string, phase: RoomPhase): void
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

  function broadcastAcks(room: string): void {
    broadcast(room, { type: 'acks', room, acks: dependencies.ack.list(room) })
    notify('ack', room)
  }

  function broadcastFloor(room: string): void {
    broadcast(room, { type: 'floor', room, floor: dependencies.floor.list(room) })
    notify('floor', room)
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
          const sender = session.name ?? 'agent'
          const stored = dependencies.sendMessage.execute({
            room: message.room,
            senderId: session.id,
            senderName: sender,
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

          if (dependencies.ack.resolve(message.room, sender)) broadcastAcks(message.room)
          if (stored.expectsReply && message.to) {
            dependencies.ack.capture(message.room, {
              id: stored.id,
              from: sender,
              to: message.to,
              deadlineSeconds: message.deadlineSeconds,
            })
            broadcastAcks(message.room)
          }
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

        case 'delete': {
          if (!dependencies.deleteRoom.execute(message.room)) {
            fail(socket, 'not_found', message.room)
            return
          }
          for (const other of sessionsIn(message.room)) {
            send(other.socket, { type: 'closed', room: message.room })
            other.rooms.delete(message.room)
          }
          notify('deleted', message.room)
          notify('rooms')
          return
        }

        case 'ping':
          send(socket, { type: 'pong' })
          return

        case 'phase': {
          if (!session.rooms.has(message.room)) {
            fail(socket, 'not_joined', message.room)
            return
          }
          const room =
            message.action === 'set' && message.phase
              ? dependencies.phase.set(message.room, message.phase)
              : dependencies.phase.advance(message.room)
          if (!room) {
            fail(socket, 'not_found', message.room)
            return
          }
          broadcast(message.room, { type: 'phase', room: message.room, phase: room.phase })
          notify('phase', message.room)
          return
        }

        case 'floor': {
          if (!session.rooms.has(message.room)) {
            fail(socket, 'not_joined', message.room)
            return
          }
          const actor = session.name ?? 'agent'
          if (message.action === 'acquire') {
            dependencies.floor.acquire(message.room, actor, message.ttlSeconds)
          } else if (message.action === 'renew') {
            dependencies.floor.renew(message.room, actor, message.ttlSeconds)
          } else {
            dependencies.floor.release(message.room, actor)
          }
          broadcastFloor(message.room)
          return
        }
      }
    } catch (error) {
      if (error instanceof DomainError) {
        fail(socket, error.code, error.message)
      } else {
        fail(socket, 'internal', 'unexpected error')
      }
    }
  }

  const sweep = setInterval(() => {
    const expired = dependencies.ack.expire()
    for (const message of expired) {
      broadcast(message.room, { type: 'message', message })
      notify('message', message)
      deliver(message)
    }
    if (expired.length) {
      for (const room of new Set(expired.map((message) => message.room))) broadcastAcks(room)
    }
    for (const room of dependencies.floor.expire()) broadcastFloor(room)
  }, options.ackSweepMs ?? 1000)
  sweep.unref?.()

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
        deleteRoom: (room: string) => {
          if (!dependencies.deleteRoom.execute(room)) return
          for (const session of sessionsIn(room)) {
            send(session.socket, { type: 'closed', room })
            session.rooms.delete(room)
          }
          notify('deleted', room)
          notify('rooms')
        },
        renameRoom: (from: string, to: string) => {
          if (!dependencies.renameRoom.execute(from, to)) return
          for (const session of sessionsIn(from)) {
            session.rooms.delete(from)
            session.rooms.add(to)
          }
          notify('renamed', from, to)
          notify('rooms')
        },
        setRoomPhase: (room: string, phase: RoomPhase) => {
          const result = dependencies.phase.set(room, phase)
          if (!result) return
          broadcast(room, { type: 'phase', room, phase: result.phase })
          notify('phase', room)
        },
        close: () =>
          new Promise<void>((done) => {
            clearInterval(sweep)
            for (const session of sessions.values()) session.socket.terminate()
            sessions.clear()
            wss.close(() => done())
          }),
      })
    })
  })
}
