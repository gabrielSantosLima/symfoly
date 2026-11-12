// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DomainError } from '../DomainError'
import { RoomStore } from '../services/RoomStore'
import { CloseRoomUseCase } from './CloseRoomUseCase'
import { CreateRoomUseCase } from './CreateRoomUseCase'
import { JoinRoomUseCase } from './JoinRoomUseCase'
import { ListRoomsUseCase } from './ListRoomsUseCase'
import { ReceiveMessagesUseCase } from './ReceiveMessagesUseCase'
import { SendMessageUseCase } from './SendMessageUseCase'

function build() {
  const rooms = new RoomStore()
  return {
    createRoom: new CreateRoomUseCase(rooms),
    joinRoom: new JoinRoomUseCase(rooms),
    sendMessage: new SendMessageUseCase(rooms),
    receive: new ReceiveMessagesUseCase(rooms),
    listRooms: new ListRoomsUseCase(rooms),
    closeRoom: new CloseRoomUseCase(rooms),
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
})
