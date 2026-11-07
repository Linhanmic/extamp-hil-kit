/**
 * 业务数据（主进程侧）：出声位置、音量表、SLOT 映射、扬声器快照的只读 IPC。
 *
 * 这些数据由项目设置里的路径指向，空串表示「还没配置」；读取时按项目根解析路径，
 * 没绑定项目或没配置路径都回 `unconfigured`，由界面提示去设置页配置。
 */
import { ipcMain } from 'electron'
import type {
  OutputLoadOutcome,
  SlotMappingLoadOutcome,
  SnapshotLoadOutcome,
  VolumeTableLoadOutcome,
} from '../src/models'
import { readOutput, readSlotMapping, readSnapshotDir, readVolumeTable } from './business-store'
import { readSettings } from './settings-store'
import { readWorkspace } from './workspace'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerBusinessIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('output:load', () => {
    const project = readWorkspace().current
    if (!project) return { unconfigured: true } satisfies OutputLoadOutcome
    try {
      const settings = readSettings(project.path).document?.settings
      return readOutput(project.path, settings?.outputPath ?? '') satisfies OutputLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies OutputLoadOutcome
    }
  })

  handle('meter:load', () => {
    const project = readWorkspace().current
    if (!project) return { unconfigured: true } satisfies VolumeTableLoadOutcome
    try {
      const settings = readSettings(project.path).document?.settings
      return readVolumeTable(project.path, settings?.volumeTablePath ?? '') satisfies VolumeTableLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies VolumeTableLoadOutcome
    }
  })

  handle('slot-map:load', () => {
    const project = readWorkspace().current
    if (!project) return { unconfigured: true } satisfies SlotMappingLoadOutcome
    try {
      const settings = readSettings(project.path).document?.settings
      return readSlotMapping(project.path, settings?.slotMappingPath ?? '') satisfies SlotMappingLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies SlotMappingLoadOutcome
    }
  })

  handle('snapshot:load', () => {
    const project = readWorkspace().current
    if (!project) return { unconfigured: true } satisfies SnapshotLoadOutcome
    try {
      const settings = readSettings(project.path).document?.settings
      return readSnapshotDir(project.path, settings?.snapshotDir ?? '') satisfies SnapshotLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies SnapshotLoadOutcome
    }
  })
}
