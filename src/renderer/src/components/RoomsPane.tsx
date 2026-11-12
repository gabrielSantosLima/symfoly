import { CreateRoomForm } from './CreateRoomForm'
import { RoomList } from './RoomList'

export function RoomsPane() {
  return (
    <aside className="flex w-72 flex-col gap-4 border-r border-border bg-surface p-4">
      <CreateRoomForm />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RoomList />
      </div>
    </aside>
  )
}
