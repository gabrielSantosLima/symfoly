import type { IconType } from 'react-icons'
import { MdCable, MdForum, MdInfo, MdSettings, MdSmartToy } from 'react-icons/md'
import { useAppData } from '../contexts/AppDataContext'
import type { View } from '../lib/ui'
import { Logo } from './Logo'

interface Item {
  id: View
  label: string
  icon: IconType
}

const ITEMS: Item[] = [
  { id: 'rooms', label: 'Rooms', icon: MdForum },
  { id: 'agents', label: 'Agents', icon: MdSmartToy },
  { id: 'connect', label: 'Connect', icon: MdCable },
  { id: 'settings', label: 'Settings', icon: MdSettings },
  { id: 'about', label: 'About', icon: MdInfo },
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
          const Icon = item.icon
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
              <Icon className="h-5 w-5" aria-hidden />
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
