import { useAppData } from '../contexts/AppDataContext'
import { roomLabel, roomTone } from '../lib/rooms'
import type { RoomInfo } from '../../../shared/protocol'
import { Badge } from './Badge'

function RoomButton({ room }: { room: RoomInfo }) {
  const { selected, select } = useAppData()
  const active = selected === room.id
  return (
    <button
      type="button"
      onClick={() => select(room.id)}
      aria-current={active ? 'true' : undefined}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      <span className="truncate font-medium">{room.name}</span>
      <Badge tone={roomTone(room)}>{roomLabel(room)}</Badge>
    </button>
  )
}

export function RoomList() {
  const { rooms } = useAppData()
  if (rooms.length === 0) {
    return <p className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No rooms yet.</p>
  }
  return (
    <ul className="flex flex-col gap-1">
      {rooms.map((room) => (
        <li key={room.id}>
          <RoomButton room={room} />
        </li>
      ))}
    </ul>
  )
}
