import { app, BrowserWindow, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'

// vite-plugin-electron 在开发模式下注入该变量；生产构建下为空，改为加载本地文件
const devServerUrl = process.env.VITE_DEV_SERVER_URL

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
    width: 1472,
    height: 960,
    // 桌面端三栏布局的最小可用尺寸，低于此尺寸栅格列会被压破
    minWidth: 1120,
    minHeight: 720,
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
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
