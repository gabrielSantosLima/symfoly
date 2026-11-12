import { useAppData } from '../contexts/AppDataContext'
import type { View } from '../lib/ui'
import { Logo } from './Logo'

interface Item {
  id: View
  label: string
  path: string
}

const ITEMS: Item[] = [
  { id: 'rooms', label: 'Rooms', path: 'M4 6h16M4 12h16M4 18h10' },
  {
    id: 'agents',
    label: 'Agents',
    path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  },
  {
    id: 'settings',
    label: 'Settings',
    path: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-11v3m0 12v3M4 12h3m12 0h3',
  },
  { id: 'about', label: 'About', path: 'M12 8h.01M11 12h1v5h1' },
]

export function NavRail({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const { status } = useAppData()

  return (
    <nav className="flex w-56 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-4 py-4">
        <Logo className="h-6 w-6 text-brand" />
        <div>
          <h1 className="text-sm font-semibold leading-tight">Symfoly</h1>
          {status && status.channel !== 'production' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-warning">
              {status.channel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2">
        {ITEMS.map((item) => {
          const active = view === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-brand text-brand-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
              }`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={item.path} />
              </svg>
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted">
        <p className="truncate">{status ? status.url : 'connecting to hub…'}</p>
      </div>
    </nav>
  )
}
