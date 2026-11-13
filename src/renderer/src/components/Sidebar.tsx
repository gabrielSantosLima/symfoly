import type { IconType } from 'react-icons'
import { MdAdd, MdCable, MdInfo, MdSettings, MdSmartToy } from 'react-icons/md'
import { useAppData } from '../contexts/AppDataContext'
import { roomLabel, roomTone } from '../lib/rooms'
import { iconButtonClass, type View } from '../lib/ui'
import { StatusDot } from './Badge'

interface NavItem {
  id: View
  label: string
  icon: IconType
}

const CONFIGURE: NavItem[] = [
  { id: 'agents', label: 'Agents', icon: MdSmartToy },
  { id: 'connect', label: 'Connect', icon: MdCable },
  { id: 'settings', label: 'Settings', icon: MdSettings },
  { id: 'about', label: 'About', icon: MdInfo },
]

const NEW_ROOM_BASE = 'new-room'

function GroupLabel({ children }: { children: string }) {
  return (
    <div className="px-2.5 pb-2 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
      {children}
    </div>
  )
}

export function Sidebar({
  view,
  onNavigate,
  query,
}: {
  view: View
  onNavigate: (view: View) => void
  query: string
}) {
  const { rooms, selected, select, createRoom } = useAppData()

  const needle = query.trim().toLowerCase()
  const visible = needle ? rooms.filter((room) => room.name.toLowerCase().includes(needle)) : rooms

  function createNewRoom(): void {
    const names = new Set(rooms.map((room) => room.name))
    let name = NEW_ROOM_BASE
    for (let index = 2; names.has(name); index += 1) name = `${NEW_ROOM_BASE}-${index}`
    void createRoom(name)
  }

  return (
    <nav
      aria-label="Sections"
      className="flex w-60 flex-none flex-col gap-1 overflow-y-auto border-r border-border bg-surface p-3"
    >
      <section>
        <GroupLabel>Operate</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {visible.map((room) => {
            const active = view === 'rooms' && selected === room.id
            return (
              <button
                key={room.id}
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  select(room.id)
                  onNavigate('rooms')
                }}
                className={`flex items-center gap-2.5 rounded-md border border-transparent px-2.5 py-1.5 text-left transition-colors ${
                  active
                    ? 'border-[color-mix(in_srgb,var(--brand)_28%,transparent)] bg-brand-soft'
                    : 'hover:bg-surface-2'
                }`}
              >
                <StatusDot tone={roomTone(room)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold">{room.name}</span>
                  <span className="block truncate text-[10.5px] text-muted">{roomLabel(room)}</span>
                </span>
              </button>
            )
          })}
          {visible.length === 0 ? (
            <p className="px-2.5 py-1 text-xs text-muted">
              {rooms.length === 0 ? 'No rooms yet.' : 'No matches.'}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          onClick={createNewRoom}
        >
          <MdAdd className="h-4 w-4" aria-hidden />
          New room
        </button>
      </section>

      <section className="mt-4">
        <GroupLabel>Configure</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {CONFIGURE.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-brand-soft text-brand'
                    : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </button>
            )
          })}
        </div>
      </section>

      <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-muted">
        <StatusDot tone="success" />
        <span className="truncate font-mono">{rooms.length} room(s)</span>
        <button
          type="button"
          className={`${iconButtonClass} ml-auto h-7 w-7`}
          title="New room"
          onClick={createNewRoom}
        >
          <MdAdd className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  )
}
