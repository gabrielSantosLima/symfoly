// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DomainError } from '../DomainError'
import { RoomStore } from '../services/RoomStore'
import { PhaseUseCase } from './PhaseUseCase'

describe('PhaseUseCase', () => {
  it('blocks executing until at least one task exists', () => {
    const rooms = new RoomStore()
    rooms.create({ name: 'r1', createdBy: 'human' })
    const phase = new PhaseUseCase(rooms)

    expect(() => phase.advance('r1')).toThrow(DomainError)
    rooms.discoverTask('r1', { title: 't', createdBy: 'human' })
    expect(phase.advance('r1')?.phase).toBe('executing')
  })

  it('blocks review until every task is closed', () => {
    const rooms = new RoomStore()
    rooms.create({ name: 'r1', createdBy: 'human' })
    const phase = new PhaseUseCase(rooms)
    const task = rooms.discoverTask('r1', { title: 't', createdBy: 'human' })

    phase.advance('r1')
    expect(() => phase.advance('r1')).toThrow(DomainError)

    rooms.claimTask('r1', task.id, 'a', 10_000)
    rooms.completeTask('r1', task.id, 'a', 'done')
    expect(phase.advance('r1')?.phase).toBe('review')
  })

  it('lets the human set any phase', () => {
    const rooms = new RoomStore()
    rooms.create({ name: 'r1', createdBy: 'human' })
    const phase = new PhaseUseCase(rooms)
    expect(phase.set('r1', 'review')?.phase).toBe('review')
  })

  it('stays put once it reaches review', () => {
    const rooms = new RoomStore()
    rooms.create({ name: 'r1', createdBy: 'human' })
    const phase = new PhaseUseCase(rooms)
    phase.set('r1', 'review')
    expect(phase.advance('r1')?.phase).toBe('review')
  })
})
