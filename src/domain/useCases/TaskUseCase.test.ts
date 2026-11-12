// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DomainError } from '../DomainError'
import { RoomStore } from '../services/RoomStore'
import { TaskUseCase } from './TaskUseCase'

function setup(ttlSeconds = 60) {
  const rooms = new RoomStore()
  rooms.create({ name: 'r1', createdBy: 'human' })
  return new TaskUseCase(rooms, ttlSeconds)
}

function code(fn: () => unknown): string {
  try {
    fn()
  } catch (error) {
    if (error instanceof DomainError) return error.code
    throw error
  }
  throw new Error('expected a DomainError')
}

describe('TaskUseCase', () => {
  it('discovers and claims a task', () => {
    const tasks = setup()
    const discovered = tasks.execute({
      room: 'r1',
      action: 'discover',
      actor: 'a',
      title: 'parser',
    })
    const id = discovered.task?.id ?? ''
    const claimed = tasks.execute({ room: 'r1', action: 'claim', actor: 'a', id })
    expect(claimed.task?.owner).toBe('a')
    expect(claimed.task?.status).toBe('claimed')
  })

  it('refuses a second owner while the lease is held', () => {
    const tasks = setup()
    const { task } = tasks.execute({ room: 'r1', action: 'discover', actor: 'a', title: 'x' })
    tasks.execute({ room: 'r1', action: 'claim', actor: 'a', id: task?.id ?? '' })
    expect(
      code(() => tasks.execute({ room: 'r1', action: 'claim', actor: 'b', id: task?.id ?? '' })),
    ).toBe('already_claimed')
  })

  it('lets another agent reclaim after the lease expires', () => {
    const tasks = setup(0)
    const { task } = tasks.execute({ room: 'r1', action: 'discover', actor: 'a', title: 'x' })
    tasks.execute({ room: 'r1', action: 'claim', actor: 'a', id: task?.id ?? '' })
    const reclaimed = tasks.execute({ room: 'r1', action: 'claim', actor: 'b', id: task?.id ?? '' })
    expect(reclaimed.task?.owner).toBe('b')
  })

  it('enforces dependencies and verification rules', () => {
    const tasks = setup()
    const a = tasks.execute({ room: 'r1', action: 'discover', actor: 'a', title: 'A' }).task
    const b = tasks.execute({
      room: 'r1',
      action: 'discover',
      actor: 'a',
      title: 'B',
      deps: [a?.id ?? ''],
    }).task

    expect(
      code(() => tasks.execute({ room: 'r1', action: 'claim', actor: 'b', id: b?.id ?? '' })),
    ).toBe('deps_pending')

    tasks.execute({ room: 'r1', action: 'claim', actor: 'a', id: a?.id ?? '' })
    tasks.execute({ room: 'r1', action: 'complete', actor: 'a', id: a?.id ?? '', result: 'ok' })

    expect(
      code(() => tasks.execute({ room: 'r1', action: 'verify', actor: 'a', id: a?.id ?? '' })),
    ).toBe('self_verify')

    const verified = tasks.execute({ room: 'r1', action: 'verify', actor: 'b', id: a?.id ?? '' })
    expect(verified.task?.status).toBe('verified')

    const claimedB = tasks.execute({ room: 'r1', action: 'claim', actor: 'b', id: b?.id ?? '' })
    expect(claimedB.task?.owner).toBe('b')
  })
})
