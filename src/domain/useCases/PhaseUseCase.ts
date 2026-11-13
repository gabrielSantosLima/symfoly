import type { RoomInfo, RoomPhase, TaskStatus } from '../../shared/protocol'
import { DomainError } from '../DomainError'
import type { RoomStore } from '../services/RoomStore'

const ORDER: RoomPhase[] = ['planning', 'executing', 'review']
const CLOSED: TaskStatus[] = ['done', 'verified', 'closed']

/**
 * Room phases act as barriers: `advance` only moves to the next phase when the
 * current one is complete; `set` is the human override.
 */
export class PhaseUseCase {
  constructor(private readonly rooms: RoomStore) {}

  set(room: string, phase: RoomPhase): RoomInfo | undefined {
    return this.rooms.setPhase(room, phase)?.toInfo()
  }

  advance(room: string): RoomInfo | undefined {
    const entity = this.rooms.get(room)
    if (!entity) return undefined
    const current = entity.toInfo().phase
    const next = ORDER[ORDER.indexOf(current) + 1]
    if (!next) return entity.toInfo()
    this.assertBarrier(room, current)
    return this.rooms.setPhase(room, next)?.toInfo()
  }

  private assertBarrier(room: string, current: RoomPhase): void {
    const tasks = this.rooms.listTasks(room)
    if (current === 'planning' && tasks.length === 0) {
      throw new DomainError('barrier_no_plan', 'add at least one task before executing')
    }
    if (current === 'executing') {
      const open = tasks.filter((task) => !CLOSED.includes(task.status))
      if (open.length) {
        throw new DomainError('barrier_tasks_open', `${open.length} task(s) still open`)
      }
    }
  }
}
