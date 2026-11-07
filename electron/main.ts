import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { registerConfigsIpc } from './configs'
import { registerRequirementsIpc } from './requirements'
import { registerSettingsIpc } from './settings'
import { registerWorkspaceIpc } from './workspace'

// vite-plugin-electron 在开发模式下注入该变量；生产构建下为空，改为加载本地文件
const devServerUrl = process.env.VITE_DEV_SERVER_URL

// 窗口与界面布局一律使用 DIP（逻辑像素），由系统缩放负责整体放大：
// 不设置 zoomFactor，因此 125% 缩放下界面按 1.25 倍物理像素呈现，字号跟随用户的缩放偏好，
// 窗口在缩放比不同的显示器之间移动时也由 Chromium 自动重排。
const WINDOW_WIDTH = 1176
const WINDOW_HEIGHT = 768
const MIN_WINDOW_WIDTH = 1120
const MIN_WINDOW_HEIGHT = 720

let mainWindow: BrowserWindow | null = null

// 无边框窗口下，窗口控制按钮由渲染层自绘，经 IPC 调用这里
function registerWindowControls() {
  const fromEvent = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender)

  const handle = (channel: string, listener: (event: IpcMainInvokeEvent) => unknown) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('window:minimize', (event) => fromEvent(event)?.minimize())
  handle('window:toggle-maximize', (event) => {
    const win = fromEvent(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  handle('window:close', (event) => fromEvent(event)?.close())
  handle('window:is-maximized', (event) => fromEvent(event)?.isMaximized() ?? false)
}

function createWindow() {
  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    // 桌面端三栏布局的最小可用尺寸，低于此尺寸栅格列会被压破
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    // 无边框：标题栏与窗口控制全部由渲染层实现
    frame: false,
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    title: 'extamp-hil-kit',
    // 应用图标：黑底白 HIL，同时用于任务栏与窗口
    icon: join(import.meta.dirname, '../build/icon.ico'),
    webPreferences: {
      preload: join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow = win

  // Chromium 会按 host 记住页面缩放并持久化，历史版本用过 zoomFactor 补偿时重启会残留，
  // 这里显式复位为 1，保证界面始终按系统缩放呈现
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomFactor(1)
  })

  win.once('ready-to-show', () => win.show())

  // 最大化状态变化同步给渲染层，用于切换最大化 / 还原图标
  win.on('maximize', () => win.webContents.send('window:maximized-change', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized-change', false))

  // 外链交给系统浏览器，应用窗口内不做跨域导航
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('closed', () => {
    mainWindow = null
  })

  if (devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(join(import.meta.dirname, '../dist/index.html'))
  }
}

// 单实例锁：重复启动时聚焦已有窗口，而不是再开一个进程
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    registerWindowControls()
    registerWorkspaceIpc()
    registerRequirementsIpc()
    registerConfigsIpc()
    registerSettingsIpc()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
