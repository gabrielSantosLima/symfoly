import type { CreateRoomRequest, HubEvent, HubStatus, SetupResult } from './ipc'
import type { RoomDetail, RoomInfo, RoomPhase } from './protocol'
import type { AppSettingsData } from './settings'

export interface SymfolyApi {
  getVersion: () => Promise<string>
  listRooms: () => Promise<RoomInfo[]>
  createRoom: (input: CreateRoomRequest) => Promise<RoomInfo>
  closeRoom: (room: string) => Promise<boolean>
  pauseRoom: (room: string, paused: boolean) => Promise<boolean>
  deleteRoom: (room: string) => Promise<boolean>
  renameRoom: (room: string, name: string) => Promise<boolean>
  setPhase: (room: string, phase: RoomPhase) => Promise<boolean>
  getRoomDetail: (room: string) => Promise<RoomDetail | undefined>
  getStatus: () => Promise<HubStatus>
  getSettings: () => Promise<AppSettingsData>
  saveSettings: (patch: Partial<AppSettingsData>) => Promise<AppSettingsData>
  setupAgents: () => Promise<SetupResult[]>
  onEvent: (handler: (event: HubEvent) => void) => () => void
}
