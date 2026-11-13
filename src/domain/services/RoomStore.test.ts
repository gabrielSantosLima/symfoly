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

  it('trims old messages when retention is applied', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    for (let index = 0; index < 5; index++) {
      store.append('r1', { senderId: 's1', senderName: 'a', text: `m${index}` })
    }
    store.setRetention(2)
    expect(store.history('r1').map((m) => m.text)).toEqual(['m3', 'm4'])
    store.append('r1', { senderId: 's1', senderName: 'a', text: 'm5' })
    expect(store.history('r1').map((m) => m.text)).toEqual(['m4', 'm5'])
  })

  it('deletes a room and its contents', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.append('r1', { senderId: 's1', senderName: 'a', text: 'hi' })
    expect(store.delete('r1')).toBe(true)
    expect(store.get('r1')).toBeUndefined()
    expect(store.list()).toHaveLength(0)
    expect(store.delete('missing')).toBe(false)
  })

  it('renames a room and re-keys its contents', () => {
    const store = new RoomStore()
    store.create({ name: 'old', createdBy: 'human', brief: 'b' })
    store.join('old', { sessionId: 's1', name: 'a', kind: 'agent' })
    store.append('old', { senderId: 's1', senderName: 'a', text: 'hi' })
    store.discoverTask('old', { title: 't', createdBy: 'human' })

    const renamed = store.rename('old', 'new')

    expect(renamed?.name).toBe('new')
    expect(store.get('old')).toBeUndefined()
    expect(store.list().map((room) => room.name)).toEqual(['new'])
    expect(store.participantsOf('new')).toHaveLength(1)
    expect(store.history('new').map((message) => message.room)).toEqual(['new'])
    expect(store.listTasks('new')[0]?.room).toBe('new')
  })

  it('refuses to rename onto an existing room', () => {
    const store = new RoomStore()
    store.create({ name: 'a', createdBy: 'human' })
    store.create({ name: 'b', createdBy: 'human' })
    expect(() => store.rename('a', 'b')).toThrow()
    expect(store.get('a')).toBeDefined()
  })

  it('keeps the message cursor after a rename', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.append('r1', { senderId: 's1', senderName: 'a', text: 'one' })
    store.rename('r1', 'r2')
    const next = store.append('r2', { senderId: 's1', senderName: 'a', text: 'two' })
    expect(next.seq).toBe(2)
    expect(store.history('r2').map((message) => message.text)).toEqual(['one', 'two'])
  })

  it('returns undefined when renaming a missing room', () => {
    const store = new RoomStore()
    expect(store.rename('missing', 'other')).toBeUndefined()
  })

  it('treats renaming to the same name as a no-op', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    expect(store.rename('r1', 'r1')?.name).toBe('r1')
    expect(store.list()).toHaveLength(1)
  })

  it('preserves room metadata across a rename', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human', brief: 'keep me' })
    store.close('r1')
    const renamed = store.rename('r1', 'r2')
    expect(renamed?.brief).toBe('keep me')
    expect(renamed?.isOpen).toBe(false)
  })
})
