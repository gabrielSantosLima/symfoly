import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { RoomsController } from '../controllers/RoomsController'
import { EndpointStore } from '../domain/services/EndpointStore'
import { createHubServer, type HubHandle } from '../domain/services/HubServer'
import { RoomStore } from '../domain/services/RoomStore'
import { CloseRoomUseCase } from '../domain/useCases/CloseRoomUseCase'
import { CreateRoomUseCase } from '../domain/useCases/CreateRoomUseCase'
import { GetRoomDetailUseCase } from '../domain/useCases/GetRoomDetailUseCase'
import { JoinRoomUseCase } from '../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../domain/useCases/SendMessageUseCase'
import { SetRoomPausedUseCase } from '../domain/useCases/SetRoomPausedUseCase'
import { registerIpc } from './ipc'

let mainWindow: BrowserWindow | null = null
let hub: HubHandle | null = null

const endpointStore = new EndpointStore()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Composition root: builds the store, use cases, controllers and the hub. */
async function bootstrap(): Promise<void> {
  const rooms = new RoomStore()
  const receiveMessages = new ReceiveMessagesUseCase(rooms)

  hub = await createHubServer(
    {
      joinRoom: new JoinRoomUseCase(rooms),
      leaveRoom: new LeaveRoomUseCase(rooms),
      sendMessage: new SendMessageUseCase(rooms),
      receiveMessages,
      listRooms: new ListRoomsUseCase(rooms),
      closeRoom: new CloseRoomUseCase(rooms),
      setRoomPaused: new SetRoomPausedUseCase(rooms),
    },
    { token: randomUUID(), port: 0 },
  )
  endpointStore.save({ port: hub.port, token: hub.token })

  const controller = new RoomsController({
    createRoom: new CreateRoomUseCase(rooms),
    closeRoom: new CloseRoomUseCase(rooms),
    listRooms: new ListRoomsUseCase(rooms),
    getRoomDetail: new GetRoomDetailUseCase(rooms, receiveMessages),
  })

  registerIpc(controller, hub, () => mainWindow)
  createWindow()
}

app.whenReady().then(() => {
  ipcMain.handle('app:version', () => app.getVersion())

  void bootstrap()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  endpointStore.clear()
})
