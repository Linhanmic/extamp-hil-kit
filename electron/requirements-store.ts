/**
 * 需求数据落盘：把解析结果写成项目目录下的 .hil-kit/requirements.json，以及从该文件读回。
 *
 * 单独成文件（不依赖 Electron）方便单测直接校验文件布局与内容。
 *
 * 导入语义：一张需求表对应一份数据文件。首次导入建立文件并写 createdAt，
 * 之后每次导入都是**更新**——createdAt 保持不变，requirements 整体替换，
 * updatedAt 刷新为本次导入时间。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  Requirement,
  RequirementsDocument,
  RequirementsLoadOutcome,
  RequirementsParseResult,
  RequirementsSavedState,
  Variant,
} from '../src/models/common'

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

/**
 * 读取已落盘的需求数据。
 *
 * 文件不存在 → `empty`（还没导入过）；存在但结构/版本不可用 → `error`，
 * 由界面提示重新导入，而不是把半份数据当可信对象用。
 */
export function readRequirements(projectPath: string): RequirementsLoadOutcome {
  const targetPath = requirementsFilePath(projectPath)

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(targetPath, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { empty: true }
    return { error: `需求数据文件无法解析，请重新导入（${targetPath}）` }
  }

  if (!isRecord(raw)) return { error: `需求数据结构不正确，请重新导入（${targetPath}）` }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return {
      error: `需求数据结构版本 ${String(raw.schemaVersion)} 不受支持（当前为 ${SCHEMA_VERSION}），请重新导入`,
    }
  }
  if (
    typeof raw.createdAt !== 'string' ||
    typeof raw.updatedAt !== 'string' ||
    !Array.isArray(raw.requirements) ||
    !raw.requirements.every(isRequirement)
  ) {
    return { error: `需求数据结构不正确，请重新导入（${targetPath}）` }
  }

  return {
    document: {
      schemaVersion: SCHEMA_VERSION,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      requirements: raw.requirements,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isVariant(value: unknown): value is Variant {
  if (!isRecord(value)) return false
  return (
    typeof value.requirement_id === 'string' &&
    typeof value.key === 'string' &&
    isStringArray(value.content) &&
    isStringArray(value.vehicles)
  )
}

function isRequirement(value: unknown): value is Requirement {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.detail === 'string' &&
    Array.isArray(value.variants) &&
    value.variants.every(isVariant)
  )
}

/** 写入解析结果，返回落盘摘要；目录不存在时自动创建 */
export function writeRequirements(
  projectPath: string,
  result: RequirementsParseResult,
): RequirementsSavedState {
  const targetPath = requirementsFilePath(projectPath)
  const updatedAt = new Date().toISOString()
  const createdAt = readCreatedAt(targetPath) ?? updatedAt

  const document: RequirementsDocument = {
    schemaVersion: SCHEMA_VERSION,
    createdAt,
    updatedAt,
    // 车型清单不落盘：它可以从各变体的 vehicles 汇总得到，
    // 上百个车型的需求表存一份全集会让文件白白翻倍
    requirements: result.requirements,
  }

  mkdirSync(join(projectPath, DATA_DIR), { recursive: true })
  writeFileSync(targetPath, JSON.stringify(document, null, 2), 'utf8')

  return {
    filePath: targetPath,
    createdAt,
    updatedAt,
    requirementCount: result.stats.requirementCount,
    variantCount: result.stats.variantCount,
  }
}
