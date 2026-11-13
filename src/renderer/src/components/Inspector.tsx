import type { ReactNode } from 'react'
import { useAppData } from '../contexts/AppDataContext'
import type { TaskInfo, TaskStatus } from '../../../shared/protocol'
import type { Tone } from './Badge'
import { StatusDot } from './Badge'
import { Avatar } from './Avatar'

const LANES: { status: TaskStatus; label: string; tone: Tone }[] = [
  { status: 'open', label: 'Open', tone: 'neutral' },
  { status: 'claimed', label: 'In progress', tone: 'working' },
  { status: 'blocked', label: 'Blocked', tone: 'danger' },
  { status: 'done', label: 'Done', tone: 'success' },
  { status: 'verified', label: 'Verified', tone: 'success' },
]

function leaseLabel(task: TaskInfo): string | null {
  if (!task.leaseExpiresAt) return null
  const seconds = Math.max(0, Math.round((task.leaseExpiresAt - Date.now()) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `lease ${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function formatDuration(ms: number | null): string {
  if (ms === null) return 'in progress'
  const total = Math.max(0, Math.round(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function Card({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-xs font-bold">{title}</h3>
        {meta ? <span className="text-[11px] text-muted">{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}

export function Inspector() {
  const { detail } = useAppData()

  if (!detail) {
    return (
      <aside className="flex w-[340px] flex-none items-center justify-center border-l border-border bg-surface p-4 text-center text-xs text-muted">
        Select a room to see its members and board.
      </aside>
    )
  }

  const { tasks, participants, messages, metrics } = detail
  const verified = tasks.filter((task) => task.status === 'verified').length
  const pendingAcks = detail.acks.filter((ack) => ack.status === 'pending')

  return (
    <aside className="flex w-[340px] flex-none flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-3.5">
      <Card title="Members" meta={String(participants.length)}>
        {participants.length === 0 ? (
          <p className="text-[12.5px] text-muted">No members yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {participants.map((participant) => (
              <li key={participant.id} className="flex items-center gap-2.5 py-0.5 text-[12.5px]">
                <Avatar
                  name={participant.name}
                  variant={participant.kind === 'human' ? 'human' : 'agent'}
                  size={22}
                />
                <span className="font-semibold">{participant.name}</span>
                <span className="ml-auto text-[11px] text-muted">{participant.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pendingAcks.length ? (
        <Card title="Waiting on" meta={String(pendingAcks.length)}>
          <ul className="flex flex-col gap-1.5">
            {pendingAcks.map((ack) => {
              const seconds = Math.max(0, Math.round((ack.deadlineAt - Date.now()) / 1000))
              return (
                <li key={ack.id} className="flex items-center gap-2 text-[12.5px]">
                  <StatusDot tone="attention" />
                  <span className="font-semibold">{ack.to}</span>
                  <span className="text-muted">← {ack.from}</span>
                  <span className="ml-auto font-mono text-[11px] text-muted">{seconds}s</span>
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <Card
        title="Board"
        meta={tasks.length ? `${verified} / ${tasks.length} verified` : undefined}
      >
        {tasks.length === 0 ? (
          <p className="text-[12.5px] text-muted">
            No tasks yet. Agents create them with the{' '}
            <code className="font-mono">symfoly_task</code> tool.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {LANES.map((lane) => {
              const items = tasks.filter((task) => task.status === lane.status)
              if (items.length === 0) return null
              return (
                <div key={lane.status}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <StatusDot tone={lane.tone} />
                    <span className="text-[11px] font-bold text-muted">{lane.label}</span>
                    <span className="text-[11px] text-faint">· {items.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {items.map((task) => {
                      const lease = leaseLabel(task)
                      return (
                        <li
                          key={task.id}
                          className="rounded-md border border-border bg-surface p-2"
                          style={{ borderLeft: `3px solid var(--${lane.tone})` }}
                        >
                          <div className="text-xs font-semibold leading-snug">{task.title}</div>
                          <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-muted">
                            {task.owner ? (
                              <span className="flex items-center gap-1">
                                <Avatar name={task.owner} size={15} />
                                {task.owner}
                              </span>
                            ) : (
                              <span>unassigned</span>
                            )}
                            {lease ? <span className="font-mono">{lease}</span> : null}
                          </div>
                          {task.result ? (
                            <div className="mt-1 text-[11px] text-muted">{task.result}</div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card title="Coordination">
        <dl className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
          <dt className="text-muted">Conflicts avoided</dt>
          <dd className="text-right font-semibold">{metrics.conflicts}</dd>
          <dt className="text-muted">Escalations</dt>
          <dd className="text-right font-semibold">{metrics.escalations}</dd>
          <dt className="text-muted">Tasks verified</dt>
          <dd className="text-right font-semibold">
            {metrics.verified} / {metrics.tasks}
          </dd>
          <dt className="text-muted">Convergence</dt>
          <dd className="text-right font-semibold">{formatDuration(metrics.convergenceMs)}</dd>
        </dl>
      </Card>

      <Card title="Overview">
        <dl className="grid grid-cols-2 gap-y-1.5 text-[12.5px]">
          <dt className="text-muted">Members</dt>
          <dd className="text-right font-semibold">{participants.length}</dd>
          <dt className="text-muted">Tasks</dt>
          <dd className="text-right font-semibold">{tasks.length}</dd>
          <dt className="text-muted">Messages</dt>
          <dd className="text-right font-semibold">{messages.length}</dd>
          <dt className="text-muted">Phase</dt>
          <dd className="text-right font-semibold">{detail.room.phase}</dd>
          <dt className="text-muted">Turn</dt>
          <dd className="text-right font-semibold">{detail.floor.holder ?? 'free'}</dd>
          <dt className="text-muted">Status</dt>
          <dd className="text-right font-semibold">{detail.room.status}</dd>
        </dl>
      </Card>
    </aside>
  )
}
