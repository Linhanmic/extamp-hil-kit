/**
 * 需求导入（主进程侧）：读需求分析表 → 解析成 Requirement / Variant → 落盘到项目目录。
 *
 * 渲染层只负责选表、核对列配置与预览，解析与写文件都在这里完成：
 * 渲染进程在 sandbox 下没有 Node 能力，Excel 解析也只在主进程里做一次。
 *
 * 落盘位置：<Gauge 项目>/.hil-kit/requirements.json
 */
import { BrowserWindow, dialog, ipcMain } from 'electron'
import type {
  RequirementsChooseOutcome,
  RequirementsLoadOutcome,
  RequirementsParseConfig,
  RequirementsParseResult,
  RequirementsPreviewOutcome,
  RequirementsProbeOutcome,
  RequirementsSaveOutcome,
  RequirementsMappingSaveOutcome,
} from '../src/models/common'
import { parseRequirements, probeSheet } from './requirements-parse'
import { listSheets, readSheetTable } from './requirements-sheet'
import { readRequirements, writeRequirements, writeRequirementsMapping } from './requirements-store'
import { readSettings, resolveProjectPath } from './settings-store'
import { readWorkspace } from './workspace'

const EXCEL_FILTERS: Electron.FileFilter[] = [
  { name: '需求分析表', extensions: ['xlsx', 'xlsm', 'xls'] },
]

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function parseFile(config: RequirementsParseConfig): RequirementsParseResult {
  return parseRequirements(readSheetTable(config.filePath, config.sheetName), config)
}

export function registerRequirementsIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('requirements:load', () => {
    const project = readWorkspace().current
    // 没绑定项目时没有可读的数据，按「还没导入」处理
    if (!project) return { empty: true } satisfies RequirementsLoadOutcome

    try {
      // 需求数据的位置由项目设置决定，缺省是 .hil-kit/requirements.json
      const settings = readSettings(project.path).document?.settings
      return readRequirements(project.path, settings?.requirementsPath ?? '') satisfies RequirementsLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsLoadOutcome
    }
  })

  handle('requirements:choose', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: '选择需求分析表',
      buttonLabel: '选择该文件',
      filters: EXCEL_FILTERS,
      properties: ['openFile'],
    }
    // 设置里配过默认需求表时，选择器直接从那里开始
    const project = readWorkspace().current
    const defaultFile = project
      ? resolveProjectPath(project.path, readSettings(project.path).document?.settings.requirementsImport.filePath ?? '')
      : ''
    if (defaultFile) options.defaultPath = defaultFile

    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)

    const filePath = result.filePaths[0]
    if (result.canceled || !filePath) return { canceled: true } satisfies RequirementsChooseOutcome

    try {
      return { file: { filePath, sheets: listSheets(filePath) } }
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsChooseOutcome
    }
  })

  handle(
    'requirements:probe',
    (_event, filePath: string, sheetName: string, headerRow?: number) => {
      try {
        const outcome = probeSheet(readSheetTable(filePath, sheetName), headerRow)
        if (outcome.error) return { error: outcome.error } satisfies RequirementsProbeOutcome
        return { probe: outcome.probe } satisfies RequirementsProbeOutcome
      } catch (error) {
        return { error: errorMessage(error) } satisfies RequirementsProbeOutcome
      }
    },
  )

  handle('requirements:preview', (_event, config: RequirementsParseConfig) => {
    try {
      const project = readWorkspace().current
      const resolved = project
        ? { ...config, filePath: resolveProjectPath(project.path, config.filePath) }
        : config
      return { result: parseFile(resolved) } satisfies RequirementsPreviewOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsPreviewOutcome
    }
  })

  handle('requirements:save', (_event, config: RequirementsParseConfig) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目，请先在启动页选择项目' }

    try {
      const resolved = { ...config, filePath: resolveProjectPath(project.path, config.filePath) }
      const result = parseFile(resolved)
      // 车型列有空单元格时整份不导入：缺填写的变体必须先在表里补齐
      if (result.stats.blankCells) {
        return {
          error: `有 ${result.stats.blankCells} 个变体单元格为空，缺少适用情况：适用请写「●」，不适用请写「—」；补齐后重新预览再导入`,
        } satisfies RequirementsSaveOutcome
      }
      const settings = readSettings(project.path).document?.settings
      const saved = writeRequirements(project.path, result, settings?.requirementsPath ?? '')
      return { saved } satisfies RequirementsSaveOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsSaveOutcome
    }
  })

  handle('requirements:save-mapping', (_event, mapping: Record<string, boolean>) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目，请先在启动页选择项目' }
    try {
      const settings = readSettings(project.path).document?.settings
      const saved = writeRequirementsMapping(
        project.path,
        mapping,
        settings?.requirementsPath ?? '',
      )
      return { saved } satisfies RequirementsMappingSaveOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsMappingSaveOutcome
    }
  })
}
