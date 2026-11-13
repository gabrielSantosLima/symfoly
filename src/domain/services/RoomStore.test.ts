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

  it('tracks a pending ack until the addressee answers', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.addAck('r1', { id: 'm1', from: 'a', to: 'b', deadlineAt: Date.now() + 10_000 })
    expect(store.listAcks('r1')).toHaveLength(1)
    expect(store.listAcks('r1')[0]?.status).toBe('pending')

    expect(store.resolveAcks('r1', 'b')).toBe(true)
    expect(store.listAcks('r1')[0]?.status).toBe('answered')
    expect(store.resolveAcks('r1', 'b')).toBe(false)
  })

  it('expires overdue acks', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.addAck('r1', { id: 'm1', from: 'a', to: 'b', deadlineAt: Date.now() - 1 })

    const expired = store.expireAcks()
    expect(expired).toHaveLength(1)
    expect(expired[0]?.ack.status).toBe('expired')
    expect(store.listAcks('r1')[0]?.status).toBe('expired')
  })

  it('keeps acks across a rename', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.addAck('r1', { id: 'm1', from: 'a', to: 'b', deadlineAt: Date.now() + 1000 })
    store.rename('r1', 'r2')
    expect(store.listAcks('r2')[0]?.room).toBe('r2')
    expect(store.listAcks('r1')).toHaveLength(0)
  })

  it('starts rooms in the planning phase and lets the phase change', () => {
    const store = new RoomStore()
    const room = store.create({ name: 'r1', createdBy: 'human' })
    expect(room.toInfo().phase).toBe('planning')
    store.setPhase('r1', 'executing')
    expect(store.get('r1')?.toInfo().phase).toBe('executing')
  })

  it('serializes the floor between two holders', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.acquireFloor('r1', 'a', 10_000)
    expect(store.floorOf('r1').holder).toBe('a')
    expect(() => store.acquireFloor('r1', 'b', 10_000)).toThrow()
    store.releaseFloor('r1', 'a')
    expect(store.floorOf('r1').holder).toBeNull()
    store.acquireFloor('r1', 'b', 10_000)
    expect(store.floorOf('r1').holder).toBe('b')
  })

  it('expires the floor when its lease passes', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.acquireFloor('r1', 'a', -1)
    expect(store.floorOf('r1').holder).toBeNull()
    expect(store.expireFloors()).toEqual(['r1'])
  })

  it('keeps the floor across a rename', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    store.acquireFloor('r1', 'a', 10_000)
    store.rename('r1', 'r2')
    expect(store.floorOf('r2').holder).toBe('a')
  })

  it('derives coordination metrics from stored state', () => {
    const store = new RoomStore()
    store.create({ name: 'r1', createdBy: 'human' })
    const task = store.discoverTask('r1', { title: 't', createdBy: 'human' })
    store.append('r1', { senderId: 's1', senderName: 'a', text: 'hi' })
    store.claimTask('r1', task.id, 'a', 10_000)
    expect(() => store.claimTask('r1', task.id, 'b', 10_000)).toThrow()

    const metrics = store.metricsOf('r1')
    expect(metrics.messages).toBe(1)
    expect(metrics.tasks).toBe(1)
    expect(metrics.conflicts).toBe(1)
    expect(metrics.convergenceMs).toBeNull()

    store.completeTask('r1', task.id, 'a', 'done')
    store.verifyTask('r1', task.id, 'b')
    expect(store.metricsOf('r1').verified).toBe(1)
    expect(store.metricsOf('r1').convergenceMs).toBeTypeOf('number')
  })
})
