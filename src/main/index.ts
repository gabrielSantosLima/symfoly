import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import {
  Menu,
  Tray,
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  shell,
  type NativeImage,
} from 'electron'
import { RoomsController } from '../controllers/RoomsController'
import { EndpointStore } from '../domain/services/EndpointStore'
import { createHubServer, type HubHandle } from '../domain/services/HubServer'
import { Persistence } from '../domain/services/Persistence'
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
let persistence: Persistence | null = null
let tray: Tray | null = null
let isQuitting = false

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

  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault()
      mainWindow?.hide()
    }
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

function trayIcon(): NativeImage {
  const candidates = app.isPackaged
    ? [join(process.resourcesPath, 'tray.png'), join(process.resourcesPath, 'icon.png')]
    : [join(__dirname, '../../resources/tray.png'), join(__dirname, '../../resources/icon.png')]
  for (const candidate of candidates) {
    const image = nativeImage.createFromPath(candidate)
    if (!image.isEmpty()) return image
  }
  return nativeImage.createEmpty()
}

function showWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

/** Tray icon; closing the window hides it here instead of quitting. */
function createTray(): void {
  const image = trayIcon()
  if (image.isEmpty()) return
  tray = new Tray(image)
  tray.setToolTip('Symfoly')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Symfoly', click: () => showWindow() },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
  tray.on('double-click', () => showWindow())
}

/** Composition root: builds the store, use cases, controllers and the hub. */
async function bootstrap(): Promise<void> {
  const rooms = new RoomStore()
  const receiveMessages = new ReceiveMessagesUseCase(rooms)

  persistence = new Persistence(join(app.getPath('userData'), 'store.json'))
  const loaded = persistence.load()
  if (loaded) rooms.restore(loaded)
  rooms.onChange(() => persistence?.schedule(rooms.snapshot()))

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
  createTray()
  createWindow()
}

app.whenReady().then(() => {
  ipcMain.handle('app:version', () => app.getVersion())

  void bootstrap()

  app.on('activate', () => {
    showWindow()
  })
})

app.on('window-all-closed', () => {
  if (isQuitting || !tray) app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  persistence?.flush()
  endpointStore.clear()
})
