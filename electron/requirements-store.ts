/**
 * 需求数据落盘：把解析结果写成项目目录下的 .hil-kit/requirements.json。
 *
 * 单独成文件（不依赖 Electron）方便单测直接校验文件布局与内容。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  RequirementsParseConfig,
  RequirementsParseResult,
  RequirementsSavedState,
} from '../src/models/common'

/** 工具集在项目目录下的数据目录 */
export const DATA_DIR = '.hil-kit'
export const REQUIREMENTS_FILE = 'requirements.json'

/** 需求数据的落盘路径 */
export function requirementsFilePath(projectPath: string): string {
  return join(projectPath, DATA_DIR, REQUIREMENTS_FILE)
}

/** 写入解析结果，返回落盘摘要；目录不存在时自动创建 */
export function writeRequirements(
  projectPath: string,
  config: RequirementsParseConfig,
  result: RequirementsParseResult,
): RequirementsSavedState {
  const targetPath = requirementsFilePath(projectPath)
  const importedAt = new Date().toISOString()

  mkdirSync(join(projectPath, DATA_DIR), { recursive: true })
  writeFileSync(
    targetPath,
    JSON.stringify(
      {
        version: 1,
        importedAt,
        source: {
          filePath: config.filePath,
          sheetName: config.sheetName,
          headerRow: config.headerRow,
          idCol: config.idCol,
          nameCol: config.nameCol,
          detailCol: config.detailCol,
          vehicleStartCol: config.vehicleStartCol,
        },
        vehicles: result.vehicles,
        requirements: result.requirements,
      },
      null,
      2,
    ),
    'utf8',
  )

  return {
    filePath: targetPath,
    importedAt,
    requirementCount: result.stats.requirementCount,
    variantCount: result.stats.variantCount,
  }
}
