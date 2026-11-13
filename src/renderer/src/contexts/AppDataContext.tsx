import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { HubEvent, HubStatus } from '../../../shared/ipc'
import type { RoomDetail, RoomInfo } from '../../../shared/protocol'
import type { AppSettingsData } from '../../../shared/settings'

export interface AppData {
  status: HubStatus | null
  version: string
  rooms: RoomInfo[]
  selected: string | null
  detail: RoomDetail | null
  settings: AppSettingsData | null
  error: string
  select: (room: string | null) => void
  createRoom: (name: string, brief?: string) => Promise<void>
  closeRoom: () => Promise<void>
  deleteRoom: () => Promise<void>
  renameRoom: (room: string, name: string) => Promise<void>
  setPaused: (paused: boolean) => Promise<void>
  saveSettings: (patch: Partial<AppSettingsData>) => Promise<void>
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const client = window.symfoly
  const [status, setStatus] = useState<HubStatus | null>(null)
  const [version, setVersion] = useState('')
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [settings, setSettings] = useState<AppSettingsData | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!client) return
    setRooms(await client.listRooms())
    setStatus(await client.getStatus())
  }, [client])

  const loadDetail = useCallback(
    async (room: string) => {
      if (!client) return
      setDetail((await client.getRoomDetail(room)) ?? null)
    },
    [client],
  )

  useEffect(() => {
    if (!client) return
    void client
      .getVersion()
      .then(setVersion)
      .catch(() => setVersion(''))
    void client.getSettings().then(setSettings)
    void refresh()
    return client.onEvent((event: HubEvent) => {
      if (event.type === 'message') {
        const message = event.message
        setDetail((current) =>
          current && current.room.name === message.room
            ? { ...current, messages: [...current.messages, message] }
            : current,
        )
      } else if (event.type === 'task') {
        if (selected) void loadDetail(selected)
      } else if (event.type === 'deleted') {
        setSelected((current) => (current === event.room ? null : current))
        void refresh()
      } else if (event.type === 'renamed') {
        setSelected((current) => (current === event.from ? event.to : current))
        void refresh()
      } else {
        void refresh()
      }
    })
  }, [client, refresh, selected, loadDetail])

  useEffect(() => {
    if (selected) void loadDetail(selected)
    else setDetail(null)
  }, [selected, loadDetail])

  const createRoom = useCallback(
    async (name: string, brief?: string) => {
      if (!client || !name.trim()) return
      try {
        setError('')
        const room = await client.createRoom({
          name: name.trim(),
          brief: brief?.trim() || undefined,
        })
        await refresh()
        setSelected(room.name)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [client, refresh],
  )

  const closeRoom = useCallback(async () => {
    if (!client || !selected) return
    await client.closeRoom(selected)
    await refresh()
    await loadDetail(selected)
  }, [client, selected, refresh, loadDetail])

  const deleteRoom = useCallback(async () => {
    if (!client || !selected) return
    await client.deleteRoom(selected)
    setSelected(null)
    setDetail(null)
    await refresh()
  }, [client, selected, refresh])

  const renameRoom = useCallback(
    async (room: string, name: string) => {
      if (!client || !name.trim()) return
      try {
        setError('')
        await client.renameRoom(room, name.trim())
        await refresh()
        setSelected(name.trim())
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [client, refresh],
  )

  const setPaused = useCallback(
    async (paused: boolean) => {
      if (!client || !selected) return
      await client.pauseRoom(selected, paused)
      await refresh()
      await loadDetail(selected)
    },
    [client, selected, refresh, loadDetail],
  )

  const saveSettings = useCallback(
    async (patch: Partial<AppSettingsData>) => {
      if (!client) return
      setSettings(await client.saveSettings(patch))
    },
    [client],
  )

  const value: AppData = {
    status,
    version,
    rooms,
    selected,
    detail,
    settings,
    error,
    select: setSelected,
    createRoom,
    closeRoom,
    deleteRoom,
    renameRoom,
    setPaused,
    saveSettings,
  }

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  const value = useContext(AppDataContext)
  if (!value) throw new Error('useAppData must be used within an AppDataProvider')
  return value
}
