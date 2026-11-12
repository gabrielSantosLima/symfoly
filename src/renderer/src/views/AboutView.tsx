import { Logo } from '../components/Logo'
import { ViewHeader } from '../components/ViewHeader'
import { useAppData } from '../contexts/AppDataContext'
import { cardClass } from '../lib/ui'

export function AboutView() {
  const { version, status, rooms } = useAppData()
  const channel = status?.channel ?? '—'
  const suffix = channel !== 'production' ? ` · ${channel}` : ''

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewHeader title="About" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className={`${cardClass} max-w-lg p-6`}>
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-10 text-brand" />
            <div>
              <h3 className="text-lg font-semibold">Symfoly</h3>
              <p className="text-sm text-muted">
                {version ? `v${version}` : ''}
                {suffix}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted">Channel</dt>
            <dd>{channel}</dd>
            <dt className="text-muted">Hub</dt>
            <dd className="truncate">{status?.url ?? '—'}</dd>
            <dt className="text-muted">Rooms</dt>
            <dd>{rooms.length}</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}
