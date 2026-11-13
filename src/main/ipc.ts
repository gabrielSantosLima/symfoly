import { ipcMain, type BrowserWindow } from 'electron'
import type { RoomsController } from '../controllers/RoomsController'
import type { SettingsController } from '../controllers/SettingsController'
import type { HubHandle } from '../domain/services/HubServer'
import { IPC, type CreateRoomRequest, type HubEvent } from '../shared/ipc'
import type { RoomPhase } from '../shared/protocol'
import type { AppSettingsData } from '../shared/settings'
import type { ConnectInfo, SetupResult } from '../shared/ipc'

export interface IpcDependencies {
  rooms: RoomsController
  settings: SettingsController
  hub: HubHandle
  channel: string
  connect: ConnectInfo
  runAgentSetup: () => SetupResult[]
  getWindow: () => BrowserWindow | null
  applySettings: (settings: AppSettingsData) => void
}

/** Registers IPC handlers and forwards hub events to the renderer window. */
export function registerIpc(dependencies: IpcDependencies): void {
  const { rooms, settings, hub, channel, connect, runAgentSetup, getWindow, applySettings } =
    dependencies

  ipcMain.handle(IPC.status, () => ({
    port: hub.port,
    url: `ws://127.0.0.1:${hub.port}`,
    roomCount: rooms.list().length,
    channel,
    connect,
  }))

  ipcMain.handle(IPC.listRooms, () => rooms.list())
  ipcMain.handle(IPC.createRoom, (_event, input: CreateRoomRequest) => rooms.create(input))
  ipcMain.handle(IPC.closeRoom, (_event, room: string) => {
    hub.closeRoom(room)
    return true
  })
  ipcMain.handle(IPC.pauseRoom, (_event, room: string, paused: boolean) => {
    hub.setRoomPaused(room, paused)
    return true
  })
  ipcMain.handle(IPC.deleteRoom, (_event, room: string) => {
    hub.deleteRoom(room)
    return true
  })
  ipcMain.handle(IPC.renameRoom, (_event, room: string, name: string) => {
    hub.renameRoom(room, name)
    return true
  })
  ipcMain.handle(IPC.phase, (_event, room: string, phase: RoomPhase) => {
    hub.setRoomPhase(room, phase)
    return true
  })
  ipcMain.handle(IPC.roomDetail, (_event, room: string) => rooms.detail(room))
  ipcMain.handle(IPC.getSettings, () => settings.get())
  ipcMain.handle(IPC.saveSettings, (_event, patch: Partial<AppSettingsData>) => {
    const next = settings.save(patch)
    applySettings(next)
    return next
  })
  ipcMain.handle(IPC.setupAgents, () => runAgentSetup())

  const forward = (event: HubEvent): void => {
    getWindow()?.webContents.send(IPC.event, event)
  }
  hub.on('message', (message) => forward({ type: 'message', message }))
  hub.on('presence', (presence) => forward({ type: 'presence', ...presence }))
  hub.on('closed', (room) => forward({ type: 'closed', room }))
  hub.on('rooms', () => forward({ type: 'rooms' }))
  hub.on('task', (room) => forward({ type: 'task', room }))
  hub.on('deleted', (room) => forward({ type: 'deleted', room }))
  hub.on('renamed', (from, to) => forward({ type: 'renamed', from, to }))
  hub.on('ack', (room) => forward({ type: 'ack', room }))
  hub.on('phase', (room) => forward({ type: 'phase', room }))
  hub.on('floor', (room) => forward({ type: 'floor', room }))
}
