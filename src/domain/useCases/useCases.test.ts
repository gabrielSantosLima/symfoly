// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DomainError } from '../DomainError'
import { RoomStore } from '../services/RoomStore'
import { CloseRoomUseCase } from './CloseRoomUseCase'
import { CreateRoomUseCase } from './CreateRoomUseCase'
import { GetRoomDetailUseCase } from './GetRoomDetailUseCase'
import { JoinRoomUseCase } from './JoinRoomUseCase'
import { ListRoomsUseCase } from './ListRoomsUseCase'
import { ReceiveMessagesUseCase } from './ReceiveMessagesUseCase'
import { SendMessageUseCase } from './SendMessageUseCase'
import { SetRoomPausedUseCase } from './SetRoomPausedUseCase'

function build() {
  const rooms = new RoomStore()
  const receive = new ReceiveMessagesUseCase(rooms)
  return {
    createRoom: new CreateRoomUseCase(rooms),
    joinRoom: new JoinRoomUseCase(rooms),
    sendMessage: new SendMessageUseCase(rooms),
    receive,
    listRooms: new ListRoomsUseCase(rooms),
    closeRoom: new CloseRoomUseCase(rooms),
    getRoomDetail: new GetRoomDetailUseCase(rooms, receive),
  }
}

describe('use cases', () => {
  it('creates and joins a room', () => {
    const { createRoom, joinRoom } = build()
    const room = createRoom.execute({ name: 'r1', createdBy: 'human', brief: 'goal' })
    expect(room.brief).toBe('goal')
    const joined = joinRoom.execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    expect(joined.participants).toHaveLength(1)
  })

  it('rejects sending before joining', () => {
    const { createRoom, sendMessage } = build()
    createRoom.execute({ name: 'r1', createdBy: 'human' })
    expect(() =>
      sendMessage.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'hi' }),
    ).toThrow(DomainError)
  })

  it('rejects sending to a closed room', () => {
    const { createRoom, joinRoom, sendMessage, closeRoom } = build()
    createRoom.execute({ name: 'r1', createdBy: 'human' })
    joinRoom.execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    closeRoom.execute('r1')
    try {
      sendMessage.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'hi' })
      expect.unreachable('expected sendMessage to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError)
      expect((error as DomainError).code).toBe('room_closed')
    }
  })

  it('reads history excluding the caller', () => {
    const { createRoom, joinRoom, sendMessage, receive } = build()
    createRoom.execute({ name: 'r1', createdBy: 'human' })
    joinRoom.execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    joinRoom.execute({ room: 'r1', sessionId: 's2', name: 'b', kind: 'agent' })
    sendMessage.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'mine' })
    sendMessage.execute({ room: 'r1', senderId: 's2', senderName: 'b', text: 'theirs' })
    expect(
      receive.execute({ rooms: ['r1'], since: 0, excludeSender: 's1' }).map((m) => m.text),
    ).toEqual(['theirs'])
  })

  it('lists rooms', () => {
    const { createRoom, listRooms } = build()
    createRoom.execute({ name: 'r1', createdBy: 'human' })
    createRoom.execute({ name: 'r2', createdBy: 'human' })
    expect(listRooms.execute()).toHaveLength(2)
  })

  it('returns room detail with participants and history', () => {
    const { createRoom, joinRoom, sendMessage, getRoomDetail } = build()
    createRoom.execute({ name: 'r1', createdBy: 'human', brief: 'goal' })
    joinRoom.execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    sendMessage.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'hello' })
    const detail = getRoomDetail.execute('r1')
    expect(detail?.room.brief).toBe('goal')
    expect(detail?.participants.map((p) => p.name)).toEqual(['a'])
    expect(detail?.messages.map((m) => m.text)).toEqual(['hello'])
    expect(getRoomDetail.execute('missing')).toBeUndefined()
  })

  it('rejects sending to a paused room', () => {
    const rooms = new RoomStore()
    new CreateRoomUseCase(rooms).execute({ name: 'r1', createdBy: 'human' })
    new JoinRoomUseCase(rooms).execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    new SetRoomPausedUseCase(rooms).execute('r1', true)
    const send = new SendMessageUseCase(rooms)
    try {
      send.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'hi' })
      expect.unreachable('expected sendMessage to throw')
    } catch (error) {
      expect((error as DomainError).code).toBe('paused')
    }
  })

  it('enforces the per-room message cap', () => {
    const rooms = new RoomStore()
    new CreateRoomUseCase(rooms).execute({ name: 'r1', createdBy: 'human' })
    new JoinRoomUseCase(rooms).execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    const send = new SendMessageUseCase(rooms, undefined, { maxMessagesPerRoom: 2 })
    send.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'one' })
    send.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'two' })
    try {
      send.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'three' })
      expect.unreachable('expected sendMessage to throw')
    } catch (error) {
      expect((error as DomainError).code).toBe('room_full')
    }
  })

  it('enforces the sender rate limit', () => {
    const rooms = new RoomStore()
    new CreateRoomUseCase(rooms).execute({ name: 'r1', createdBy: 'human' })
    new JoinRoomUseCase(rooms).execute({ room: 'r1', sessionId: 's1', name: 'a', kind: 'agent' })
    const send = new SendMessageUseCase(rooms, undefined, {
      rateLimit: 1,
      rateWindowMs: 60_000,
      maxMessagesPerRoom: 100,
    })
    send.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'one' })
    try {
      send.execute({ room: 'r1', senderId: 's1', senderName: 'a', text: 'two' })
      expect.unreachable('expected sendMessage to throw')
    } catch (error) {
      expect((error as DomainError).code).toBe('rate_limited')
    }
  })
})
