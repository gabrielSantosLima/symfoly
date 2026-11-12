// Shared wire protocol between the Symfoly hub and its clients
// (the MCP bridge, the CLI and the renderer). Kept dependency-free so it can
// be imported from the main process, tests and future adapters.

export type ParticipantKind = 'agent' | 'human'
export type RoomStatus = 'open' | 'closed'
export type MessageKind = 'chat' | 'task' | 'result' | 'system'

export interface ProtocolMessage {
  id: string
  /** Monotonic cursor, unique per room. Clients pass the last seen value as `since`. */
  seq: number
  room: string
  senderId: string | null
  senderName: string | null
  kind: MessageKind
  text: string
  to?: string
  ref?: string
  expectsReply?: boolean
  done?: boolean
  ts: number
}

export interface ParticipantInfo {
  id: string
  name: string
  kind: ParticipantKind
  sessionId: string
  joinedAt: number
}

export interface RoomInfo {
  id: string
  name: string
  topic?: string
  brief?: string
  status: RoomStatus
  createdBy: string
  createdAt: number
  closedAt?: number
}

export interface RoomDetail {
  room: RoomInfo
  participants: ParticipantInfo[]
  messages: ProtocolMessage[]
}

export interface ClientMessageMap {
  /** First message on every connection. A bad token closes the socket. */
  hello: { token: string; name: string; kind: ParticipantKind }
  join: { room: string }
  leave: { room: string }
  send: {
    room: string
    text: string
    to?: string
    kind?: MessageKind
    ref?: string
    expectsReply?: boolean
    done?: boolean
  }
  /** Long-poll: resolves with new messages, or empty after `wait` seconds. */
  receive: {
    room?: string
    all?: boolean
    since?: number
    wait?: number
    requestId: string
  }
  rooms: Record<never, never>
  ping: Record<never, never>
}

export type ClientMessage = {
  [K in keyof ClientMessageMap]: ClientMessageMap[K] & { type: K }
}[keyof ClientMessageMap]

export interface HubMessageMap {
  welcome: { sessionId: string; name: string; kind: ParticipantKind }
  room_state: { room: RoomInfo; participants: ParticipantInfo[] }
  message: { message: ProtocolMessage }
  presence: { room: string; name: string; status: 'joined' | 'left' }
  closed: { room: string }
  rooms: { rooms: RoomInfo[] }
  received: { requestId: string; messages: ProtocolMessage[] }
  error: { code: string; message: string }
  pong: Record<never, never>
}

export type HubMessage = {
  [K in keyof HubMessageMap]: HubMessageMap[K] & { type: K }
}[keyof HubMessageMap]
