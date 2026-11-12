import type { ProtocolMessage } from './protocol'

/** IPC channel names shared by the main process and the preload bridge. */
export const IPC = {
  status: 'hub:status',
  listRooms: 'rooms:list',
  createRoom: 'rooms:create',
  closeRoom: 'rooms:close',
  pauseRoom: 'rooms:pause',
  roomDetail: 'rooms:detail',
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  event: 'symfoly:event',
} as const

export interface CreateRoomRequest {
  name: string
  brief?: string
  topic?: string
}

export interface HubStatus {
  port: number
  url: string
  roomCount: number
}

/** Events pushed from the main process to the renderer. */
export type HubEvent =
  | { type: 'message'; message: ProtocolMessage }
  | { type: 'presence'; room: string; name: string; status: 'joined' | 'left' }
  | { type: 'closed'; room: string }
  | { type: 'rooms' }
