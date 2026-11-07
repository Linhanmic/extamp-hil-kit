/**
 * 项目设置（主进程侧）：读写 <项目>/.hil-kit/settings.json，以及设置页要用的
 * 文件 / 目录选择器。
 *
 * 设置描述各业务数据放在哪，所以它一定属于某个项目；没有绑定项目时按默认值返回，
 * 由界面自己决定是否允许编辑。
 */
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { DEFAULT_PROJECT_SETTINGS } from '../src/config/settings-defaults'
import type {
  ProjectSettings,
  ProjectSettingsDocument,
  SettingsLoadOutcome,
  SettingsPickKind,
  SettingsPickOutcome,
  SettingsSaveOutcome,
} from '../src/models/common'
import { readSettings, resolveProjectPath, writeSettings } from './settings-store'
import { readWorkspace } from './workspace'

const PICK_FILTERS: Record<SettingsPickKind, Electron.FileFilter[]> = {
  'requirements-json': [{ name: '需求数据', extensions: ['json'] }],
  'configs-json': [{ name: '配置参数', extensions: ['json'] }],
  'volume-table': [
    { name: '音量表', extensions: ['csv', 'xlsx', 'xls'] },
    { name: '所有文件', extensions: ['*'] },
  ],
  'slot-mapping': [
    { name: 'SLOT 映射配置', extensions: ['ini', 'txt', 'conf'] },
    { name: '所有文件', extensions: ['*'] },
  ],
  'requirements-sheet': [{ name: '需求分析表', extensions: ['xlsx', 'xlsm', 'xls'] }],
}

const PICK_TITLES: Record<SettingsPickKind, string> = {
  'requirements-json': '选择需求数据文件',
  'configs-json': '选择配置参数文件',
  'volume-table': '选择音量表文件',
  'slot-mapping': '选择 SLOT 映射配置文件',
  'requirements-sheet': '选择需求分析表',
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 某一类目标当前配置的路径，用于文件选择器的起始位置 */
function currentPath(settings: ProjectSettings, kind: SettingsPickKind): string {
  switch (kind) {
    case 'requirements-json':
      return settings.requirementsPath
    case 'configs-json':
      return settings.configsPath
    case 'volume-table':
      return settings.volumeTablePath
    case 'slot-mapping':
      return settings.slotMappingPath
    case 'requirements-sheet':
      return settings.requirementsImport.filePath
  }
}

export function registerSettingsIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('settings:load', () => {
    const project = readWorkspace().current
    if (!project) {
      const document: ProjectSettingsDocument = {
        schemaVersion: 1,
        updatedAt: '',
        settings: DEFAULT_PROJECT_SETTINGS,
      }
      return { document } satisfies SettingsLoadOutcome
    }

    try {
      return readSettings(project.path) satisfies SettingsLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies SettingsLoadOutcome
    }
  })

  handle('settings:save', (_event, settings: ProjectSettings) => {
    const project = readWorkspace().current
    if (!project) {
      return { error: '还没有绑定 Gauge 项目，请先在启动页选择项目' } satisfies SettingsSaveOutcome
    }

    try {
      return { saved: writeSettings(project.path, settings) } satisfies SettingsSaveOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies SettingsSaveOutcome
    }
  })

  handle('settings:pick-file', async (event, kind: SettingsPickKind) => {
    const project = readWorkspace().current
    try {
      const current = project
        ? readSettings(project.path).document?.settings
        : DEFAULT_PROJECT_SETTINGS
      const options: Electron.OpenDialogOptions = {
        title: PICK_TITLES[kind] ?? '选择文件',
        buttonLabel: '选择该文件',
        filters: PICK_FILTERS[kind] ?? [],
        properties: ['openFile'],
      }
      const startAt = project && current ? resolveProjectPath(project.path, currentPath(current, kind)) : ''
      if (startAt) options.defaultPath = startAt

      const win = BrowserWindow.fromWebContents(event.sender)
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)

      const filePath = result.filePaths[0]
      if (result.canceled || !filePath) return { canceled: true } satisfies SettingsPickOutcome
      return { path: filePath } satisfies SettingsPickOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies SettingsPickOutcome
    }
  })

  handle('settings:pick-directory', async (event) => {
    const project = readWorkspace().current
    try {
      const options: Electron.OpenDialogOptions = {
        title: '选择目录',
        buttonLabel: '选择该目录',
        properties: ['openDirectory'],
      }
      const settings = project ? readSettings(project.path).document?.settings : null
      const startAt = project
        ? resolveProjectPath(project.path, settings?.snapshotDir ?? '') || project.path
        : ''
      if (startAt) options.defaultPath = startAt

      const win = BrowserWindow.fromWebContents(event.sender)
      const result = win
        ? await dialog.showOpenDialog(win, options)
        : await dialog.showOpenDialog(options)

      const dirPath = result.filePaths[0]
      if (result.canceled || !dirPath) return { canceled: true } satisfies SettingsPickOutcome
      return { path: dirPath } satisfies SettingsPickOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies SettingsPickOutcome
    }
  })
}
