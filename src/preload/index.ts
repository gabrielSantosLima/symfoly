import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { SymfolyApi } from '../shared/api'
import { IPC, type CreateRoomRequest, type HubEvent } from '../shared/ipc'
import type { RoomPhase } from '../shared/protocol'
import type { AppSettingsData } from '../shared/settings'
const api: SymfolyApi = {
  getVersion: () => ipcRenderer.invoke('app:version'),
  listRooms: () => ipcRenderer.invoke(IPC.listRooms),
  createRoom: (input: CreateRoomRequest) => ipcRenderer.invoke(IPC.createRoom, input),
  closeRoom: (room: string) => ipcRenderer.invoke(IPC.closeRoom, room),
  pauseRoom: (room: string, paused: boolean) => ipcRenderer.invoke(IPC.pauseRoom, room, paused),
  deleteRoom: (room: string) => ipcRenderer.invoke(IPC.deleteRoom, room),
  renameRoom: (room: string, name: string) => ipcRenderer.invoke(IPC.renameRoom, room, name),
  setPhase: (room: string, phase: RoomPhase) => ipcRenderer.invoke(IPC.phase, room, phase),
  getRoomDetail: (room: string) => ipcRenderer.invoke(IPC.roomDetail, room),
  getStatus: () => ipcRenderer.invoke(IPC.status),
  getSettings: () => ipcRenderer.invoke(IPC.getSettings),
  saveSettings: (patch: Partial<AppSettingsData>) => ipcRenderer.invoke(IPC.saveSettings, patch),
  setupAgents: () => ipcRenderer.invoke(IPC.setupAgents),
  setupSkills: () => ipcRenderer.invoke(IPC.setupSkills),
  diagnostics: () => ipcRenderer.invoke(IPC.diagnostics),
  onEvent: (handler: (event: HubEvent) => void) => {
    const listener = (_event: IpcRendererEvent, payload: HubEvent): void => handler(payload)
    ipcRenderer.on(IPC.event, listener)
    return () => {
      ipcRenderer.removeListener(IPC.event, listener)
    }
  },
}

contextBridge.exposeInMainWorld('symfoly', api)
