import { useAppData } from '../contexts/AppDataContext'
import { CreateRoomForm } from './CreateRoomForm'
import { RoomList } from './RoomList'
import { SettingsPanel } from './SettingsPanel'

export function Sidebar() {
  const { status } = useAppData()

  return (
    <aside className="flex w-80 flex-col gap-4 border-r border-slate-200 p-4 dark:border-slate-800">
      <CreateRoomForm />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <RoomList />
      </div>
      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <SettingsPanel />
        <p className="mt-2 truncate text-[11px] text-slate-400">
          {status ? status.url : 'connecting to hub…'}
        </p>
      </div>
    </aside>
  )
}
