import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
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
import { AgentSetup, type SetupTarget } from '../domain/services/AgentSetup'
import { createHubServer, type HubHandle } from '../domain/services/HubServer'
import { Launchers, type LauncherSpec } from '../domain/services/Launchers'
import { Persistence } from '../domain/services/Persistence'
import { RoomStore } from '../domain/services/RoomStore'
import { SettingsStore } from '../domain/services/SettingsStore'
import { symfolyHome } from '../domain/services/paths'
import { CloseRoomUseCase } from '../domain/useCases/CloseRoomUseCase'
import { CreateRoomUseCase } from '../domain/useCases/CreateRoomUseCase'
import { GetRoomDetailUseCase } from '../domain/useCases/GetRoomDetailUseCase'
import { JoinRoomUseCase } from '../domain/useCases/JoinRoomUseCase'
import { LeaveRoomUseCase } from '../domain/useCases/LeaveRoomUseCase'
import { ListRoomsUseCase } from '../domain/useCases/ListRoomsUseCase'
import { ReceiveMessagesUseCase } from '../domain/useCases/ReceiveMessagesUseCase'
import { SendMessageUseCase } from '../domain/useCases/SendMessageUseCase'
import { SetRoomPausedUseCase } from '../domain/useCases/SetRoomPausedUseCase'
import { DeleteRoomUseCase } from '../domain/useCases/DeleteRoomUseCase'
import { GetRoomStateUseCase } from '../domain/useCases/GetRoomStateUseCase'
import { RenameRoomUseCase } from '../domain/useCases/RenameRoomUseCase'
import { TaskUseCase } from '../domain/useCases/TaskUseCase'
import type { AppSettingsData } from '../shared/settings'
import type { ConnectInfo } from '../shared/ipc'
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

/** Spec used both for the launcher shims and the Connect view. */
function adapterSpec(bundled: string, sourceRelativePath: string): LauncherSpec {
  const bundledPath = resourcePath(bundled)
  if (app.isPackaged || existsSync(bundledPath)) {
    return { command: process.execPath, args: [bundledPath] }
  }
  try {
    const require = createRequire(import.meta.url)
    const tsx = join(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs')
    return { command: process.execPath, args: [tsx, join(app.getAppPath(), sourceRelativePath)] }
  } catch {
    return { command: process.execPath, args: [join(app.getAppPath(), sourceRelativePath)] }
  }
}

function buildConnectInfo(): ConnectInfo {
  const launcherDir = new Launchers().write({
    mcp: adapterSpec('mcp.mjs', 'src/adapters/mcp/server.ts'),
    cli: adapterSpec('symfoly.mjs', 'src/adapters/cli/index.ts'),
  })
  return {
    launcher: join(launcherDir, 'symfoly-mcp.cmd'),
    cliLauncher: join(launcherDir, 'symfoly.cmd'),
    mcpPath: app.isPackaged
      ? resourcePath('mcp.mjs')
      : join(app.getAppPath(), 'src/adapters/mcp/server.ts'),
    cliPath: app.isPackaged
      ? resourcePath('symfoly.mjs')
      : join(app.getAppPath(), 'src/adapters/cli/index.ts'),
    skillsPath: app.isPackaged
      ? join(process.resourcesPath, 'agent-skills')
      : join(app.getAppPath(), 'agent-skills'),
    home: symfolyHome(),
  }
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

function agentSetupTargets(): SetupTarget[] {
  const home = homedir()
  const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming')
  return [
    {
      id: 'opencode',
      label: 'OpenCode',
      path: join(home, '.config', 'opencode', 'opencode.json'),
      detect: join(home, '.config', 'opencode'),
      style: 'opencode',
    },
    {
      id: 'claude-desktop',
      label: 'Claude Desktop',
      path: join(appData, 'Claude', 'claude_desktop_config.json'),
      detect: join(appData, 'Claude'),
      style: 'mcpServers',
    },
    {
      id: 'claude-code',
      label: 'Claude Code',
      path: join(home, '.claude.json'),
      detect: join(home, '.claude'),
      style: 'mcpServers',
    },
    {
      id: 'cline',
      label: 'Cline (VS Code)',
      path: join(
        appData,
        'Code',
        'User',
        'globalStorage',
        'saoudrizwan.claude-dev',
        'settings',
        'cline_mcp_settings.json',
      ),
      detect: join(appData, 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings'),
      style: 'mcpServers',
    },
  ]
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
      deleteRoom: new DeleteRoomUseCase(rooms),
      renameRoom: new RenameRoomUseCase(rooms),
      task: new TaskUseCase(rooms),
      getRoomState: new GetRoomStateUseCase(rooms),
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

  const connect = buildConnectInfo()
  const agentSetup = new AgentSetup(agentSetupTargets())
  registerIpc({
    rooms: controller,
    settings,
    hub,
    channel,
    connect,
    runAgentSetup: () => agentSetup.run({ command: 'node', args: [connect.mcpPath] }),
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
