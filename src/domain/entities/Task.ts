import { randomUUID } from 'node:crypto'
import type { TaskInfo, TaskStatus } from '../../shared/protocol'
import { DomainError } from '../DomainError'

export interface NewTask {
  room: string
  title: string
  deps?: string[]
  createdBy: string
}

const CLOSED_STATES: TaskStatus[] = ['done', 'verified', 'closed']

/** A unit of work with a single owner and a time-bounded lease. */
export class Task {
  private constructor(
    readonly id: string,
    readonly room: string,
    readonly title: string,
    private status: TaskStatus,
    private owner: string | null,
    readonly deps: string[],
    private result: string | undefined,
    readonly createdBy: string,
    readonly createdAt: number,
    private updatedAt: number,
    private leaseExpiresAt: number | undefined,
    private fence: number,
  ) {}

  static create(input: NewTask, now = Date.now()): Task {
    return new Task(
      randomUUID(),
      input.room,
      input.title,
      'open',
      null,
      input.deps ?? [],
      undefined,
      input.createdBy,
      now,
      now,
      undefined,
      0,
    )
  }

  static fromInfo(info: TaskInfo): Task {
    return new Task(
      info.id,
      info.room,
      info.title,
      info.status,
      info.owner,
      info.deps,
      info.result,
      info.createdBy,
      info.createdAt,
      info.updatedAt,
      info.leaseExpiresAt,
      info.owner ? 1 : 0,
    )
  }

  get isClosed(): boolean {
    return CLOSED_STATES.includes(this.status)
  }

  get currentOwner(): string | null {
    return this.owner
  }

  get currentStatus(): TaskStatus {
    return this.status
  }

  isLeaseExpired(now = Date.now()): boolean {
    return (
      this.status === 'claimed' && this.leaseExpiresAt !== undefined && this.leaseExpiresAt <= now
    )
  }

  /** Frees an expired lease so the task can be claimed again. */
  expire(now = Date.now()): void {
    if (!this.isLeaseExpired(now)) return
    this.status = 'open'
    this.owner = null
    this.leaseExpiresAt = undefined
    this.updatedAt = now
  }

  claim(owner: string, ttlMs: number, now = Date.now()): void {
    if (this.isClosed) throw new DomainError('task_closed', `task ${this.id} is ${this.status}`)
    if (this.owner && this.owner !== owner && this.leaseExpiresAt && this.leaseExpiresAt > now) {
      throw new DomainError('already_claimed', `task ${this.id} is held by ${this.owner}`)
    }
    this.owner = owner
    this.status = 'claimed'
    this.fence += 1
    this.leaseExpiresAt = now + ttlMs
    this.updatedAt = now
  }

  renew(owner: string, ttlMs: number, now = Date.now()): void {
    if (this.owner !== owner) throw new DomainError('not_owner', `task ${this.id} is not yours`)
    this.leaseExpiresAt = now + ttlMs
    this.updatedAt = now
  }

  release(owner: string, now = Date.now()): void {
    if (this.owner !== owner) throw new DomainError('not_owner', `task ${this.id} is not yours`)
    this.owner = null
    this.status = 'open'
    this.leaseExpiresAt = undefined
    this.updatedAt = now
  }

  complete(owner: string, result: string | undefined, now = Date.now()): void {
    if (this.owner !== owner) throw new DomainError('not_owner', `task ${this.id} is not yours`)
    this.status = 'done'
    this.result = result
    this.leaseExpiresAt = undefined
    this.updatedAt = now
  }

  verify(verifier: string, now = Date.now()): void {
    if (this.status !== 'done') throw new DomainError('not_done', `task ${this.id} is not done`)
    if (this.owner === verifier) {
      throw new DomainError('self_verify', 'the owner cannot verify their own task')
    }
    this.status = 'verified'
    this.updatedAt = now
  }

  toInfo(): TaskInfo {
    return {
      id: this.id,
      room: this.room,
      title: this.title,
      status: this.status,
      owner: this.owner,
      deps: this.deps,
      result: this.result,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      leaseExpiresAt: this.leaseExpiresAt,
    }
  }
}
