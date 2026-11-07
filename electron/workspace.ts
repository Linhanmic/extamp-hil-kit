import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

export interface WorkspaceProject {
  /** 项目根目录的绝对路径 */
  path: string
  /** 展示用名称，取目录名 */
  name: string
  openedAt: number
}

export interface WorkspaceState {
  current: WorkspaceProject | null
  recents: WorkspaceProject[]
}

const MAX_RECENTS = 5

function stateFile() {
  return join(app.getPath('userData'), 'workspace.json')
}

const exists = (target: string) => existsSync(target)

/** 读取已保存的工作区；路径已不存在时自动失效，让用户重新选择 */
export function readWorkspace(): WorkspaceState {
  try {
    const raw = JSON.parse(readFileSync(stateFile(), 'utf8')) as Partial<WorkspaceState>
    const current = raw.current?.path && exists(raw.current.path) ? raw.current : null
    const recents = (raw.recents ?? [])
      .filter((item): item is WorkspaceProject => Boolean(item?.path) && exists(item.path))
      .slice(0, MAX_RECENTS)
    return { current, recents }
  } catch {
    return { current: null, recents: [] }
  }
}

function writeWorkspace(state: WorkspaceState) {
  try {
    writeFileSync(stateFile(), JSON.stringify(state, null, 2), 'utf8')
  } catch {
    // 写入失败不影响本次会话使用，下次启动会回到启动页
  }
}

/**
 * Gauge 项目校验：项目根目录必须带 manifest.json（Gauge 初始化时生成），
 * 兼容只有 .gauge 目录的情况。
 */
export function inspectProject(dir: string): { ok: true; project: WorkspaceProject } | { ok: false; reason: string } {
  if (!exists(dir) || !statSync(dir).isDirectory()) {
    return { ok: false, reason: '目录不存在或不是文件夹' }
  }
  const hasManifest = exists(join(dir, 'manifest.json'))
  const hasGaugeDir = exists(join(dir, '.gauge'))
  if (!hasManifest && !hasGaugeDir) {
    return { ok: false, reason: '不是 Gauge 项目：缺少 manifest.json 或 .gauge 目录' }
  }
  return { ok: true, project: { path: dir, name: basename(dir), openedAt: Date.now() } }
}

function commitProject(dir: string): { state: WorkspaceState; error?: string } {
  // 归一化路径，避免同一个项目因分隔符不同（\ 与 /）在最近列表里重复
  const normalized = resolve(dir)
  const inspected = inspectProject(normalized)
  if (!inspected.ok) return { state: readWorkspace(), error: inspected.reason }

  const state = readWorkspace()
  const project = inspected.project
  state.current = project
  state.recents = [project, ...state.recents.filter((item) => item.path !== project.path)].slice(
    0,
    MAX_RECENTS,
  )
  writeWorkspace(state)
  return { state }
}

export function registerWorkspaceIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('workspace:current', () => readWorkspace())

  handle('workspace:choose', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: '选择 Gauge 项目目录',
      buttonLabel: '选择该项目',
      properties: ['openDirectory'],
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)

    const picked = result.filePaths[0]
    if (result.canceled || !picked) return { canceled: true, state: readWorkspace() }
    return commitProject(picked)
  })

  handle('workspace:open', (_event, dir: string) => commitProject(dir))

  handle('workspace:clear', () => {
    const state = readWorkspace()
    state.current = null
    writeWorkspace(state)
    return state
  })
}
