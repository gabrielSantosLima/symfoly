import { randomUUID } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
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
import { AgentSetup } from '../domain/services/AgentSetup'
import { agentSetupTargets, skillTargets } from '../domain/services/agentTargets'
import { SkillSetup } from '../domain/services/SkillSetup'
import { runDiagnostics } from '../domain/services/Diagnostics'
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
import { AckUseCase } from '../domain/useCases/AckUseCase'
import { PhaseUseCase } from '../domain/useCases/PhaseUseCase'
import { FloorUseCase } from '../domain/useCases/FloorUseCase'
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

/** The Electron binary can run as plain Node; under AppImage point at the file. */
function runtimeCommand(): string {
  return process.env.APPIMAGE ?? process.execPath
}

function devSpec(sourceRelativePath: string): LauncherSpec {
  const source = join(app.getAppPath(), sourceRelativePath)
  try {
    const require = createRequire(import.meta.url)
    const tsx = join(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs')
    return { command: process.execPath, args: [tsx, source] }
  } catch {
    return { command: process.execPath, args: [source] }
  }
}

interface StableAdapters {
  mcp: string
  cli: string
  skills: string
}

/**
 * Copies the bundled adapters into a stable folder. An AppImage runs from a
 * transient mount, so `process.resourcesPath` does not survive a restart;
 * `~/.symfoly/bin` does.
 */
function materializeAdapters(): StableAdapters {
  const fallback: StableAdapters = {
    mcp: resourcePath('mcp.mjs'),
    cli: resourcePath('symfoly.mjs'),
    skills: join(process.resourcesPath, 'agent-skills'),
  }
  if (!app.isPackaged) return fallback
  try {
    const dir = join(symfolyHome(), 'bin')
    mkdirSync(dir, { recursive: true })
    const mcp = join(dir, 'mcp.mjs')
    const cli = join(dir, 'symfoly.mjs')
    const skills = join(dir, 'agent-skills')
    copyFileSync(resourcePath('mcp.mjs'), mcp)
    copyFileSync(resourcePath('symfoly.mjs'), cli)
    cpSync(resourcePath('agent-skills'), skills, { recursive: true, force: true })
    return { mcp, cli, skills }
  } catch {
    return fallback
  }
}

function buildConnectInfo(): ConnectInfo {
  const stable = materializeAdapters()
  const bundled = app.isPackaged
  const mcpSpec: LauncherSpec = bundled
    ? { command: runtimeCommand(), args: [stable.mcp] }
    : devSpec('src/adapters/mcp/server.ts')
  const cliSpec: LauncherSpec = bundled
    ? { command: runtimeCommand(), args: [stable.cli] }
    : devSpec('src/adapters/cli/index.ts')
  const launcherDir = new Launchers().write({ mcp: mcpSpec, cli: cliSpec })
  const isWindows = process.platform === 'win32'
  return {
    launcher: join(launcherDir, isWindows ? 'symfoly-mcp.cmd' : 'symfoly-mcp'),
    cliLauncher: join(launcherDir, isWindows ? 'symfoly.cmd' : 'symfoly'),
    mcpPath: bundled ? stable.mcp : join(app.getAppPath(), 'src/adapters/mcp/server.ts'),
    cliPath: bundled ? stable.cli : join(app.getAppPath(), 'src/adapters/cli/index.ts'),
    skillsPath: bundled ? stable.skills : join(app.getAppPath(), 'agent-skills'),
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

  const server = await createHubServer(
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
      ack: new AckUseCase(rooms),
      phase: new PhaseUseCase(rooms),
      floor: new FloorUseCase(rooms),
      task: new TaskUseCase(rooms),
      getRoomState: new GetRoomStateUseCase(rooms),
    },
    { token: randomUUID(), port: 0 },
  )
  hub = server
  endpointStore.save({ port: server.port, token: server.token })

  const controller = new RoomsController({
    createRoom: new CreateRoomUseCase(rooms),
    closeRoom: new CloseRoomUseCase(rooms),
    listRooms: new ListRoomsUseCase(rooms),
    getRoomDetail: new GetRoomDetailUseCase(rooms, receiveMessages),
  })

  const connect = buildConnectInfo()
  const context = { platform: process.platform, home: homedir(), env: process.env }
  const agentTargets = agentSetupTargets(context)
  const skillsTargets = skillTargets(context)
  const agentSetup = new AgentSetup(agentTargets)
  const skillSetup = new SkillSetup(skillsTargets)
  const endpointFile = defaultEndpointPath(channel)
  const isWindows = process.platform === 'win32'
  registerIpc({
    rooms: controller,
    settings,
    hub,
    channel,
    connect,
    runAgentSetup: () =>
      isWindows
        ? agentSetup.run({ command: 'node', args: [connect.mcpPath] })
        : agentSetup.run({ command: connect.launcher, args: [] }),
    runSkillSetup: () => skillSetup.run(connect.skillsPath),
    diagnostics: () =>
      runDiagnostics({
        endpointFile,
        endpointPresent: existsSync(endpointFile),
        port: server.port,
        hubUrl: `ws://127.0.0.1:${server.port}`,
        agentTargets,
        skillTargets: skillsTargets,
      }),
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
