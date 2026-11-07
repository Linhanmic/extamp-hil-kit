import type { ProjectSettings } from '../models/common'

/**
 * 项目设置的默认值：主进程与渲染层共用同一份，避免两处各写一套默认路径。
 *
 * 需求与配置参数的默认位置沿用 `.hil-kit` 目录；其余位置留空表示「还没配置」，
 * 由对应功能在用户设置前保持不可用。
 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  requirementsPath: '.hil-kit/requirements.json',
  configsPath: '.hil-kit/config.json',
  outputPath: '',
  snapshotDir: '',
  volumeTablePath: '',
  slotMappingPath: '',
  requirementsImport: {
    filePath: '',
    sheetName: '',
    headerRow: 0,
    idCol: '',
    nameCol: '',
    detailCol: '',
    vehicleStartCol: '',
  },
}
