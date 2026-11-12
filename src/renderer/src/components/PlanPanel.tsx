import { useAppData } from '../contexts/AppDataContext'
import type { TaskInfo, TaskStatus } from '../../../shared/protocol'

const GROUPS: { status: TaskStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'claimed', label: 'In progress' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'done', label: 'Done' },
  { status: 'verified', label: 'Verified' },
]

function leaseLabel(task: TaskInfo): string {
  if (!task.leaseExpiresAt) return ''
  const seconds = Math.max(0, Math.round((task.leaseExpiresAt - Date.now()) / 1000))
  return `lease ${seconds}s`
}

export function PlanPanel() {
  const { detail } = useAppData()

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        Select a room to see its plan.
      </div>
    )
  }

  const tasks = detail.tasks

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-app">
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-semibold">Plan — {detail.room.name}</h2>
        <p className="mt-1 text-xs text-muted">{tasks.length} task(s)</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">
            No tasks yet. Agents create them with the <code>symfoly_task</code> tool.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {GROUPS.map((group) => {
              const items = tasks.filter((task) => task.status === group.status)
              return (
                <div key={group.status} className="rounded-lg border border-border bg-surface p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {group.label} ({items.length})
                  </h3>
                  <ul className="mt-2 flex flex-col gap-2">
                    {items.map((task) => (
                      <li key={task.id} className="rounded-md bg-surface-2 p-2 text-sm">
                        <div className="font-medium">{task.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                          <span>{task.owner ? `@${task.owner}` : 'unassigned'}</span>
                          {task.owner && task.leaseExpiresAt ? (
                            <span>{leaseLabel(task)}</span>
                          ) : null}
                        </div>
                        {task.result ? (
                          <div className="mt-1 text-xs text-muted">{task.result}</div>
                        ) : null}
                      </li>
                    ))}
                    {items.length === 0 ? <li className="text-xs text-muted">—</li> : null}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
