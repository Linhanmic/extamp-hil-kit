/**
 * 配置参数落盘：读写项目目录下的 .hil-kit/config.json。
 *
 * 配置项与配置值全部由配置参数页手工维护，采用「读 → 改 → 写」的编辑器模型：
 * 首次保存写 createdAt，之后每次保存只刷新 updatedAt，configurations 整体覆盖。
 *
 * 落盘结构与模型只差一个字段——配置值不写 config_key（归属由所在配置项确定），
 * 读取时按所属配置项补上，写入时去掉。车型只存页面直接填写的那部分，
 * 由关联变体解析出的车型不落盘，由读取方合并计算。结构约定见 docs/config-json.md。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  ConfigsDocument,
  ConfigsLoadOutcome,
  ConfigsSavedState,
  Configuration,
  VariantRef,
} from '../src/models/common'
import { resolveProjectPath } from './settings-store'

/** 配置数据的当前结构版本 */
const SCHEMA_VERSION = 1

/** 工具集在项目目录下的数据目录 */
export const DATA_DIR = '.hil-kit'
export const CONFIGS_FILE = 'config.json'
/** 设置里没配置时的默认位置（相对项目根） */
export const DEFAULT_CONFIGS_PATH = `${DATA_DIR}/${CONFIGS_FILE}`

/** 配置数据的落盘路径：优先用设置里的路径，空串回落到默认位置 */
export function configsFilePath(projectPath: string, filePath = ''): string {
  return resolveProjectPath(projectPath, filePath, DEFAULT_CONFIGS_PATH)
}

/** 落盘形态的配置值：不带 config_key */
interface StoredConfigValue {
  value: string
  relay_variants: VariantRef[]
  vehicles: string[]
}

/** 落盘形态的配置项 */
interface StoredConfiguration {
  config_key: string
  config_value: StoredConfigValue[]
}

/** 读取已有文件里记录的首次保存时间；文件缺失或结构不可用时返回 null */
function readCreatedAt(targetPath: string): string | null {
  try {
    const raw = JSON.parse(readFileSync(targetPath, 'utf8')) as { createdAt?: unknown }
    return typeof raw.createdAt === 'string' && raw.createdAt ? raw.createdAt : null
  } catch {
    return null
  }
}

/**
 * 读取已落盘的配置数据。
 *
 * 文件不存在 → `empty`（还没维护过）；存在但结构/版本不可用 → `error`，
 * 由界面提示重新维护，而不是把半份数据当可信对象。读出来的配置值补上
 * 所属配置项的 config_key，模型与界面都不需要再传外层上下文。
 */
export function readConfigs(projectPath: string, filePath = ''): ConfigsLoadOutcome {
  const targetPath = configsFilePath(projectPath, filePath)

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(targetPath, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { empty: true }
    return { error: `配置参数文件无法解析，请重新维护（${targetPath}）` }
  }

  if (!isRecord(raw)) return { error: `配置参数数据结构不正确（${targetPath}）` }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return {
      error: `配置参数结构版本 ${String(raw.schemaVersion)} 不受支持（当前为 ${SCHEMA_VERSION}）`,
    }
  }
  if (
    typeof raw.createdAt !== 'string' ||
    typeof raw.updatedAt !== 'string' ||
    !Array.isArray(raw.configurations) ||
    !raw.configurations.every(isStoredConfiguration)
  ) {
    return { error: `配置参数数据结构不正确（${targetPath}）` }
  }

  const document: ConfigsDocument = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    configurations: (raw.configurations as StoredConfiguration[]).map((configuration) => ({
      config_key: configuration.config_key,
      config_value: configuration.config_value.map((value) => ({
        config_key: configuration.config_key,
        ...value,
      })),
    })),
  }
  return { document }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isVariantRef(value: unknown): value is VariantRef {
  if (!isRecord(value)) return false
  return (
    typeof value.requirement_name === 'string' &&
    value.requirement_name.trim() !== '' &&
    typeof value.variant_key === 'string'
  )
}

function isStoredConfigValue(value: unknown): value is StoredConfigValue {
  if (!isRecord(value)) return false
  return (
    typeof value.value === 'string' &&
    value.value.trim() !== '' &&
    Array.isArray(value.relay_variants) &&
    value.relay_variants.every(isVariantRef) &&
    isStringArray(value.vehicles)
  )
}

function isStoredConfiguration(value: unknown): value is StoredConfiguration {
  if (!isRecord(value)) return false
  return (
    typeof value.config_key === 'string' &&
    value.config_key.trim() !== '' &&
    Array.isArray(value.config_value) &&
    value.config_value.every(isStoredConfigValue)
  )
}

/**
 * 归一化并校验界面传来的配置数据：配置项 / 配置值去首尾空白后不得为空，
 * 配置项全文件唯一、同一配置项内配置值唯一，车型与变体引用去重去空。
 * 校验不过直接抛出，由 IPC 层转成错误信息回渲染层，不写文件。
 */
export function normalizeConfigurations(configurations: Configuration[]): Configuration[] {
  const seenKeys = new Set<string>()

  return configurations.map((configuration) => {
    const configKey = configuration.config_key.trim()
    if (!configKey) throw new Error('配置项名称不能为空')
    if (seenKeys.has(configKey)) throw new Error(`配置项「${configKey}」重复`)
    seenKeys.add(configKey)

    const seenValues = new Set<string>()
    return {
      config_key: configKey,
      config_value: configuration.config_value.map((value) => {
        const text = value.value.trim()
        if (!text) throw new Error(`配置项「${configKey}」下存在空的配置值`)
        if (seenValues.has(text)) throw new Error(`配置项「${configKey}」下的配置值「${text}」重复`)
        seenValues.add(text)
        return {
          config_key: configKey,
          value: text,
          relay_variants: normalizeVariantRefs(value.relay_variants, configKey, text),
          vehicles: normalizeVehicles(value.vehicles),
        }
      }),
    }
  })
}

function normalizeVariantRefs(refs: VariantRef[], configKey: string, value: string): VariantRef[] {
  const seen = new Set<string>()
  const result: VariantRef[] = []
  for (const ref of refs) {
    const requirementName = ref.requirement_name.trim()
    if (!requirementName) {
      throw new Error(`配置项「${configKey}」的配置值「${value}」存在没有需求名称的变体引用`)
    }
    const variantKey = ref.variant_key
    const id = `${requirementName}\u0000${variantKey}`
    if (seen.has(id)) continue
    seen.add(id)
    result.push({ requirement_name: requirementName, variant_key: variantKey })
  }
  return result
}

// 手工填写的车型只做 trim 与去重，不做去引号 / 下划线换算——那是需求表导入时的归一化
function normalizeVehicles(vehicles: string[]): string[] {
  const result: string[] = []
  for (const vehicle of vehicles) {
    const name = vehicle.trim()
    if (!name || result.includes(name)) continue
    result.push(name)
  }
  return result
}

/** 把模型形态转成落盘形态：配置值去掉 config_key */
function toStoredConfiguration(configuration: Configuration): StoredConfiguration {
  return {
    config_key: configuration.config_key,
    config_value: configuration.config_value.map((value) => ({
      value: value.value,
      relay_variants: value.relay_variants,
      vehicles: value.vehicles,
    })),
  }
}

/** 写入整份配置数据，返回落盘摘要；目录不存在时自动创建 */
export function writeConfigs(
  projectPath: string,
  configurations: Configuration[],
  filePath = '',
): ConfigsSavedState {
  const normalized = normalizeConfigurations(configurations)
  const targetPath = configsFilePath(projectPath, filePath)
  const updatedAt = new Date().toISOString()
  // 已有文件保留首次保存时间，损坏或缺失时按首次保存处理
  const createdAt = readCreatedAt(targetPath) ?? updatedAt

  const document = {
    schemaVersion: SCHEMA_VERSION,
    createdAt,
    updatedAt,
    configurations: normalized.map(toStoredConfiguration),
  }

  mkdirSync(dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, JSON.stringify(document, null, 2), 'utf8')

  return {
    filePath: targetPath,
    createdAt,
    updatedAt,
    configurationCount: normalized.length,
    configValueCount: normalized.reduce((sum, item) => sum + item.config_value.length, 0),
  }
}
