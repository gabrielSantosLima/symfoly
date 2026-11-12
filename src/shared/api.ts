import type { CreateRoomRequest, HubEvent, HubStatus } from './ipc'
import type { RoomDetail, RoomInfo } from './protocol'
import type { AppSettingsData } from './settings'

export interface SymfolyApi {
  getVersion: () => Promise<string>
  listRooms: () => Promise<RoomInfo[]>
  createRoom: (input: CreateRoomRequest) => Promise<RoomInfo>
  closeRoom: (room: string) => Promise<boolean>
  pauseRoom: (room: string, paused: boolean) => Promise<boolean>
  getRoomDetail: (room: string) => Promise<RoomDetail | undefined>
  getStatus: () => Promise<HubStatus>
  getSettings: () => Promise<AppSettingsData>
  saveSettings: (patch: Partial<AppSettingsData>) => Promise<AppSettingsData>
  onEvent: (handler: (event: HubEvent) => void) => () => void
}
