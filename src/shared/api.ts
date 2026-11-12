import type { CreateRoomRequest, HubEvent, HubStatus } from './ipc'
import type { RoomDetail, RoomInfo } from './protocol'

export interface SymfolyApi {
  getVersion: () => Promise<string>
  listRooms: () => Promise<RoomInfo[]>
  createRoom: (input: CreateRoomRequest) => Promise<RoomInfo>
  closeRoom: (room: string) => Promise<boolean>
  getRoomDetail: (room: string) => Promise<RoomDetail | undefined>
  getStatus: () => Promise<HubStatus>
  onEvent: (handler: (event: HubEvent) => void) => () => void
}
