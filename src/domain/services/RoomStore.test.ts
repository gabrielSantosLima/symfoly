// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { RoomStore } from './RoomStore'

describe('RoomStore', () => {
  it('creates rooms idempotently', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human', brief: 'do the thing' })
    store.create({ name: 'r1', createdBy: 'other' })
    expect(store.list()).toHaveLength(1)
    expect(store.get('r1')?.brief).toBe('do the thing')
  })

  it('joins and leaves participants', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.join('r1', { sessionId: 's1', name: 'a', kind: 'agent' })
    expect(store.participantsOf('r1')).toHaveLength(1)
    expect(store.isParticipant('r1', 's1')).toBe(true)
    store.leave('r1', 's1')
    expect(store.isParticipant('r1', 's1')).toBe(false)
  })

  it('appends messages with an increasing per-room cursor', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    const first = store.append('r1', { senderId: 's1', senderName: 'a', text: 'one' })
    const second = store.append('r1', { senderId: 's1', senderName: 'a', text: 'two' })
    expect(first.seq).toBe(1)
    expect(second.seq).toBe(2)
    expect(store.history('r1', 1).map((message) => message.text)).toEqual(['two'])
  })

  it('excludes the sender from history when asked', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.append('r1', { senderId: 's1', senderName: 'a', text: 'mine' })
    store.append('r1', { senderId: 's2', senderName: 'b', text: 'theirs' })
    expect(store.history('r1', 0, 's1').map((message) => message.text)).toEqual(['theirs'])
  })

  it('closes a room once', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.close('r1')
    expect(store.get('r1')?.isOpen).toBe(false)
    expect(store.get('r1')?.toInfo().closedAt).toBeTypeOf('number')
  })
})
