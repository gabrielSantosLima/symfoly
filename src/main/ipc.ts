import { ipcMain, type BrowserWindow } from 'electron'
import type { RoomsController } from '../controllers/RoomsController'
import type { HubHandle } from '../domain/services/HubServer'
import { IPC, type CreateRoomRequest, type HubEvent } from '../shared/ipc'

/** Registers IPC handlers and forwards hub events to the renderer window. */
export function registerIpc(
  controller: RoomsController,
  hub: HubHandle,
  getWindow: () => BrowserWindow | null,
): void {
  ipcMain.handle(IPC.status, () => ({
    port: hub.port,
    url: `ws://127.0.0.1:${hub.port}`,
    roomCount: controller.list().length,
  }))

  ipcMain.handle(IPC.listRooms, () => controller.list())
  ipcMain.handle(IPC.createRoom, (_event, input: CreateRoomRequest) => controller.create(input))
  ipcMain.handle(IPC.closeRoom, (_event, room: string) => {
    hub.closeRoom(room)
    return true
  })
  ipcMain.handle(IPC.pauseRoom, (_event, room: string, paused: boolean) => {
    hub.setRoomPaused(room, paused)
    return true
  })
  ipcMain.handle(IPC.roomDetail, (_event, room: string) => controller.detail(room))

  const forward = (event: HubEvent): void => {
    getWindow()?.webContents.send(IPC.event, event)
  }
  hub.on('message', (message) => forward({ type: 'message', message }))
  hub.on('presence', (presence) => forward({ type: 'presence', ...presence }))
  hub.on('closed', (room) => forward({ type: 'closed', room }))
  hub.on('rooms', () => forward({ type: 'rooms' }))
}
