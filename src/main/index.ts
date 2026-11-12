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
import { SettingsController } from '../controllers/SettingsController'
import { EndpointStore, defaultEndpointPath } from '../domain/services/EndpointStore'
import { createHubServer, type HubHandle } from '../domain/services/HubServer'
import { Persistence } from '../domain/services/Persistence'
import { RoomStore } from '../domain/services/RoomStore'
import { SettingsStore } from '../domain/services/SettingsStore'
import { CloseRoomUseCase } from '../domain/useCases/CloseRoomUseCase'
import { CreateRoomUseCase } from '../domain/useCases/CreateRoomUseCase'
import { GetRoomDetailUseCase } from '../domain/useCases/GetRoomDetailUseCase'
import { JoinRoomUseCase } from '../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../domain/useCases/SendMessageUseCase'
import { SetRoomPausedUseCase } from '../domain/useCases/SetRoomPausedUseCase'
import type { AppSettingsData } from '../shared/settings'
import { CHANNELS, resolveChannel, resourcePath } from './channels'
import { registerIpc } from './ipc'

const channel = resolveChannel()
const channelConfig = CHANNELS[channel]

// Channel identity must be set before the app is ready so userData is separate.
app.setName(channelConfig.name)
app.setPath('userData', join(app.getPath('appData'), channelConfig.userData))

let mainWindow: BrowserWindow | null = null
let hub: HubHandle | null = null
let persistence: Persistence | null = null
let tray: Tray | null = null
let isQuitting = false

const endpointStore = new EndpointStore(defaultEndpointPath(channel))

function windowIconPath(): string {
  return resourcePath(process.platform === 'win32' ? channelConfig.ico : channelConfig.png)
}

function trayIcon(): NativeImage {
  const image = nativeImage.createFromPath(resourcePath(channelConfig.png))
  if (image.isEmpty()) return nativeImage.createFromPath(resourcePath('icon.png'))
  return image.resize({ width: 16, height: 16 })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    title: app.getName(),
    icon: windowIconPath(),
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
  tray.setToolTip(app.getName())
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

  const settingsStore = new SettingsStore(join(app.getPath('userData'), 'settings.json'))
  const settings = new SettingsController(settingsStore)
  const applySettings = (next: AppSettingsData): void => {
    rooms.setRetention(next.retentionMessagesPerRoom)
    app.setLoginItemSettings({ openAtLogin: next.launchAtLogin })
  }
  applySettings(settings.get())

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

  registerIpc({
    rooms: controller,
    settings,
    hub,
    channel,
    getWindow: () => mainWindow,
    applySettings,
  })
  createTray()
  createWindow()
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showWindow()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId(channelConfig.appUserModelId)
    ipcMain.handle('app:version', () => app.getVersion())

    void bootstrap()

    app.on('activate', () => {
      showWindow()
    })
  })
}

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
