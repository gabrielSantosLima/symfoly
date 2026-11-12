import { randomUUID } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'
import type {
  ClientMessage,
  HubMessage,
  ParticipantKind,
  ProtocolMessage,
} from '../shared/protocol'
import { RoomManager } from './rooms'

export interface HubOptions {
  token: string
  /** 0 (default) lets the OS pick a free port. */
  port?: number
}

export interface HubHandle {
  port: number
  token: string
  rooms: RoomManager
  close(): Promise<void>
}

interface Waiter {
  requestId: string
  /** null means "all rooms the session has joined". */
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

const MAX_TEXT_LENGTH = 100_000
const MAX_WAIT_SECONDS = 300

/**
 * Starts the in-memory WebSocket hub on 127.0.0.1. Every client must send
 * `hello` with the matching token before anything else.
 */
export function createHub(options: HubOptions): Promise<HubHandle> {
  const rooms = new RoomManager()
  const sessions = new Map<string, Session>()
  const wss = new WebSocketServer({ host: '127.0.0.1', port: options.port ?? 0 })

  function send(socket: WebSocket, message: HubMessage): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  function fail(socket: WebSocket, code: string, message: string): void {
    send(socket, { type: 'error', code, message })
  }

  function sessionsIn(room: string): Session[] {
    const result: Session[] = []
    for (const participant of rooms.listParticipants(room)) {
      const session = sessions.get(participant.sessionId)
      if (session) result.push(session)
    }
    return result
  }

  function broadcast(room: string, message: HubMessage, except?: Session): void {
    for (const session of sessionsIn(room)) {
      if (session !== except) send(session.socket, message)
    }
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

    switch (message.type) {
      case 'hello':
        fail(socket, 'bad_request', 'already greeted')
        return

      case 'join': {
        const existing = rooms.getRoom(message.room)
        const room =
          existing ?? rooms.createRoom(message.room, { createdBy: session.name ?? session.id })
        if (room.status === 'closed') {
          fail(socket, 'room_closed', message.room)
          return
        }
        rooms.join(message.room, {
          sessionId: session.id,
          name: session.name ?? 'agent',
          kind: session.kind ?? 'agent',
        })
        session.rooms.add(message.room)
        send(socket, {
          type: 'room_state',
          room,
          participants: rooms.listParticipants(message.room),
        })
        broadcast(
          message.room,
          { type: 'presence', room: message.room, name: session.name ?? 'agent', status: 'joined' },
          session,
        )
        return
      }

      case 'leave': {
        rooms.leave(message.room, session.id)
        session.rooms.delete(message.room)
        broadcast(message.room, {
          type: 'presence',
          room: message.room,
          name: session.name ?? 'agent',
          status: 'left',
        })
        return
      }

      case 'send': {
        if (!session.rooms.has(message.room) || !rooms.isParticipant(message.room, session.id)) {
          fail(socket, 'not_joined', message.room)
          return
        }
        const room = rooms.getRoom(message.room)
        if (!room || room.status === 'closed') {
          fail(socket, 'room_closed', message.room)
          return
        }
        if (
          typeof message.text !== 'string' ||
          message.text.length === 0 ||
          message.text.length > MAX_TEXT_LENGTH
        ) {
          fail(socket, 'bad_request', 'text is empty or too long')
          return
        }
        const stored = rooms.append(message.room, {
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
        const collected: ProtocolMessage[] = []
        for (const name of scope) collected.push(...rooms.history(name, since, session.id))
        if (collected.length > 0) {
          send(socket, { type: 'received', requestId: message.requestId, messages: collected })
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
        send(socket, { type: 'rooms', rooms: rooms.listRooms() })
        return

      case 'ping':
        send(socket, { type: 'pong' })
        return
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
        rooms.leave(room, session.id)
        broadcast(room, {
          type: 'presence',
          room,
          name: session.name ?? 'unknown',
          status: 'left',
        })
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
        rooms,
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
