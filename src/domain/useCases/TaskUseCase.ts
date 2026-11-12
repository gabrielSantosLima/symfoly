import type { TaskInfo } from '../../shared/protocol'
import { DomainError } from '../DomainError'
import type { RoomStore } from '../services/RoomStore'

export type TaskAction = 'discover' | 'claim' | 'renew' | 'release' | 'complete' | 'verify'

export interface TaskInput {
  room: string
  action: TaskAction
  /** Stable identity of the acting agent (used as the task owner). */
  actor: string
  id?: string
  title?: string
  deps?: string[]
  ttlSeconds?: number
  result?: string
}

export interface TaskResult {
  task?: TaskInfo
  tasks: TaskInfo[]
}

const DEFAULT_TTL_SECONDS = 120

function required(value: string | undefined, label: string): string {
  if (!value) throw new DomainError('bad_request', `missing ${label}`)
  return value
}

/** Shared task board operations, enforcing one owner per task via leases. */
export class TaskUseCase {
  constructor(
    private readonly rooms: RoomStore,
    private readonly defaultTtlSeconds = DEFAULT_TTL_SECONDS,
  ) {}

  execute(input: TaskInput): TaskResult {
    const ttlMs = (input.ttlSeconds ?? this.defaultTtlSeconds) * 1000
    let task
    switch (input.action) {
      case 'discover':
        task = this.rooms.discoverTask(input.room, {
          title: required(input.title, 'title'),
          deps: input.deps,
          createdBy: input.actor,
        })
        break
      case 'claim':
        task = this.rooms.claimTask(input.room, required(input.id, 'id'), input.actor, ttlMs)
        break
      case 'renew':
        task = this.rooms.renewTask(input.room, required(input.id, 'id'), input.actor, ttlMs)
        break
      case 'release':
        task = this.rooms.releaseTask(input.room, required(input.id, 'id'), input.actor)
        break
      case 'complete':
        task = this.rooms.completeTask(
          input.room,
          required(input.id, 'id'),
          input.actor,
          input.result,
        )
        break
      case 'verify':
        task = this.rooms.verifyTask(input.room, required(input.id, 'id'), input.actor)
        break
    }
    return { task: task.toInfo(), tasks: this.rooms.listTasks(input.room) }
  }
}
