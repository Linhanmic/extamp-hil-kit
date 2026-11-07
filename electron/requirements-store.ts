/**
 * 需求数据落盘：把解析结果写成项目目录下的 .hil-kit/requirements.json。
 *
 * 单独成文件（不依赖 Electron）方便单测直接校验文件布局与内容。
 *
 * 导入语义：一张需求表对应一份数据文件。首次导入建立文件并写 createdAt，
 * 之后每次导入都是**更新**——createdAt 保持不变，requirements / vehicles 整体替换，
 * updatedAt 刷新为本次导入时间。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RequirementsParseResult, RequirementsSavedState } from '../src/models/common'

/** 需求数据的当前结构版本 */
const SCHEMA_VERSION = 1

/** 工具集在项目目录下的数据目录 */
export const DATA_DIR = '.hil-kit'
export const REQUIREMENTS_FILE = 'requirements.json'

/** 需求数据的落盘路径 */
export function requirementsFilePath(projectPath: string): string {
  return join(projectPath, DATA_DIR, REQUIREMENTS_FILE)
}

/** 读取已有文件里记录的首次导入时间；文件缺失或结构不可用时返回 null */
function readCreatedAt(targetPath: string): string | null {
  try {
    const raw = JSON.parse(readFileSync(targetPath, 'utf8')) as { createdAt?: unknown }
    return typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : null
  } catch {
    return null
  }
}

/** 写入解析结果，返回落盘摘要；目录不存在时自动创建 */
export function writeRequirements(
  projectPath: string,
  result: RequirementsParseResult,
): RequirementsSavedState {
  const targetPath = requirementsFilePath(projectPath)
  const updatedAt = new Date().toISOString()
  const createdAt = readCreatedAt(targetPath) ?? updatedAt

  mkdirSync(join(projectPath, DATA_DIR), { recursive: true })
  writeFileSync(
    targetPath,
    JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        createdAt,
        updatedAt,
        // 车型清单不落盘：它可以从各变体的 vehicles 汇总得到，
        // 上百个车型的需求表存一份全集会让文件白白翻倍
        requirements: result.requirements,
      },
      null,
      2,
    ),
    'utf8',
  )

  return {
    filePath: targetPath,
    createdAt,
    updatedAt,
    requirementCount: result.stats.requirementCount,
    variantCount: result.stats.variantCount,
  }
}
