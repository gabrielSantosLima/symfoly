// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { RoomManager } from './rooms'

describe('RoomManager', () => {
  it('creates rooms and keeps them idempotent', () => {
    const rooms = new RoomManager()
    rooms.createRoom('r1', { createdBy: 'human', brief: 'do the thing' })
    rooms.createRoom('r1', { createdBy: 'someone-else' })
    expect(rooms.listRooms()).toHaveLength(1)
    expect(rooms.getRoom('r1')?.brief).toBe('do the thing')
  })

  it('joins and leaves participants', () => {
    const rooms = new RoomManager()
    rooms.createRoom('r1', { createdBy: 'human' })
    rooms.join('r1', { sessionId: 's1', name: 'a', kind: 'agent' })
    expect(rooms.listParticipants('r1')).toHaveLength(1)
    expect(rooms.isParticipant('r1', 's1')).toBe(true)
    rooms.leave('r1', 's1')
    expect(rooms.isParticipant('r1', 's1')).toBe(false)
  })

  it('appends messages with an increasing per-room cursor', () => {
    const rooms = new RoomManager()
    rooms.createRoom('r1', { createdBy: 'human' })
    const first = rooms.append('r1', { senderId: 's1', senderName: 'a', text: 'one' })
    const second = rooms.append('r1', { senderId: 's1', senderName: 'a', text: 'two' })
    expect(first.seq).toBe(1)
    expect(second.seq).toBe(2)
    expect(rooms.history('r1', 1).map((message) => message.text)).toEqual(['two'])
  })

  it('excludes the sender from history when asked', () => {
    const rooms = new RoomManager()
    rooms.createRoom('r1', { createdBy: 'human' })
    rooms.append('r1', { senderId: 's1', senderName: 'a', text: 'mine' })
    rooms.append('r1', { senderId: 's2', senderName: 'b', text: 'theirs' })
    expect(rooms.history('r1', 0, 's1').map((message) => message.text)).toEqual(['theirs'])
  })

  it('closes a room once', () => {
    const rooms = new RoomManager()
    rooms.createRoom('r1', { createdBy: 'human' })
    rooms.close('r1')
    expect(rooms.getRoom('r1')?.status).toBe('closed')
    expect(rooms.getRoom('r1')?.closedAt).toBeTypeOf('number')
  })
})
