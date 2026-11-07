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
  RequirementsParseConfig,
  RequirementsParseResult,
  RequirementsPreviewOutcome,
  RequirementsProbeOutcome,
  RequirementsSaveOutcome,
} from '../src/models/common'
import { parseRequirements, probeSheet } from './requirements-parse'
import { listSheets, readSheetTable } from './requirements-sheet'
import { writeRequirements } from './requirements-store'
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

  handle('requirements:choose', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: '选择需求分析表',
      buttonLabel: '选择该文件',
      filters: EXCEL_FILTERS,
      properties: ['openFile'],
    }
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
      return { result: parseFile(config) } satisfies RequirementsPreviewOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsPreviewOutcome
    }
  })

  handle('requirements:save', (_event, config: RequirementsParseConfig) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目，请先在启动页选择项目' }

    try {
      const result = parseFile(config)
      const saved = writeRequirements(project.path, config, result)
      return { saved } satisfies RequirementsSaveOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies RequirementsSaveOutcome
    }
  })
}
