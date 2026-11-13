import type { ProtocolMessage } from './protocol'

/** IPC channel names shared by the main process and the preload bridge. */
export const IPC = {
  status: 'hub:status',
  listRooms: 'rooms:list',
  createRoom: 'rooms:create',
  closeRoom: 'rooms:close',
  pauseRoom: 'rooms:pause',
  deleteRoom: 'rooms:delete',
  renameRoom: 'rooms:rename',
  roomDetail: 'rooms:detail',
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  setupAgents: 'setup:agents',
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
  channel: string
  connect: ConnectInfo
}

/** Paths that the Connect view shows so the user can wire an agent up. */
export interface ConnectInfo {
  launcher: string
  cliLauncher: string
  mcpPath: string
  cliPath: string
  skillsPath: string
  home: string
}

export interface SetupResult {
  id: string
  label: string
  path: string
  status: 'created' | 'updated' | 'unchanged' | 'skipped'
  message?: string
}

/** Events pushed from the main process to the renderer. */
export type HubEvent =
  | { type: 'message'; message: ProtocolMessage }
  | { type: 'presence'; room: string; name: string; status: 'joined' | 'left' }
  | { type: 'closed'; room: string }
  | { type: 'rooms' }
  | { type: 'task'; room: string }
  | { type: 'deleted'; room: string }
  | { type: 'renamed'; from: string; to: string }
