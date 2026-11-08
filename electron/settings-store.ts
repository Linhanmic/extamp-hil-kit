/**
 * 项目设置的落盘：读写 <项目>/.hil-kit/settings.json。
 *
 * 设置描述「这个项目的数据放在哪」以及需求导入的默认参数，因此按项目保存，
 * 切换项目就跟着切换。路径允许写成相对项目根的，使用时再解析成绝对路径。
 *
 * 文件缺失或损坏都不阻塞使用：读取一律带回默认值，只把问题放进 error 让界面提示，
 * 不把半份设置当可信对象。结构约定见 docs/settings-json.md。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { DEFAULT_PROJECT_SETTINGS } from '../src/config/settings-defaults'
import type {
  ProjectSettings,
  ProjectSettingsDocument,
  SettingsLoadOutcome,
  SettingsSavedState,
} from '../src/models/common'

/** 设置文件的当前结构版本 */
const SCHEMA_VERSION = 1

/** 工具集在项目目录下的数据目录 */
export const DATA_DIR = '.hil-kit'
export const SETTINGS_FILE = 'settings.json'

/** 设置文件的落盘路径 */
export function settingsFilePath(projectPath: string): string {
  return join(projectPath, DATA_DIR, SETTINGS_FILE)
}

/**
 * 路径解析：相对路径按项目根算，绝对路径原样返回。
 * 目标为空时回落到 fallback（同样是相对项目根写法）；fallback 也为空则表示还没配置。
 */
export function resolveProjectPath(
  projectPath: string,
  target: string,
  fallback = '',
): string {
  const value = target.trim() || fallback
  if (!value) return ''
  return isAbsolute(value) ? value : resolve(projectPath, value)
}

function cloneSettings(settings: ProjectSettings): ProjectSettings {
  return JSON.parse(JSON.stringify(settings)) as ProjectSettings
}

/** 文件缺失 / 不可用时用的文档：默认值 + 空的更新时间 */
function defaultsDocument(): ProjectSettingsDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: '',
    settings: cloneSettings(DEFAULT_PROJECT_SETTINGS),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw new Error(`设置项 ${key} 必须是字符串`)
  return value.trim()
}

// 列位置允许写 Excel 列字母；空串表示自动探测
const COLUMN_PATTERN = /^[A-Za-z]{1,3}$/

function readColumn(input: Record<string, unknown>, key: string): string {
  const value = readText(input, key).toUpperCase()
  if (value && !COLUMN_PATTERN.test(value)) {
    throw new Error(`设置项 ${key} 不是有效的列号：${value}`)
  }
  return value
}

function readHeaderRow(input: Record<string, unknown>): number {
  const value = input.headerRow
  if (value === undefined || value === null) return 0
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('设置项 headerRow 必须是不小于 0 的整数')
  }
  return value
}

/** 校验并归一化设置：去首尾空白、列号转大写、时间与结构版本由调用方补齐 */
export function sanitizeSettings(input: unknown): ProjectSettings {
  if (!isRecord(input)) throw new Error('设置结构不正确')
  const importInput = input.requirementsImport
  if (importInput !== undefined && !isRecord(importInput)) {
    throw new Error('设置项 requirementsImport 结构不正确')
  }
  const importSettings = importInput ?? {}

  return {
    requirementsPath: readText(input, 'requirementsPath'),
    configsPath: readText(input, 'configsPath'),
    outputPath: readText(input, 'outputPath'),
    snapshotPath: readText(input, 'snapshotPath'),
    volumeTablePath: readText(input, 'volumeTablePath'),
    slotMappingPath: readText(input, 'slotMappingPath'),
    conceptOutputPath: readText(input, 'conceptOutputPath'),
    slotConceptOutputPath: readText(input, 'slotConceptOutputPath'),
    gaugeExecutable: readText(input, 'gaugeExecutable'),
    gaugeArgs: readText(input, 'gaugeArgs'),
    gaugeEnv: readText(input, 'gaugeEnv'),
    requirementsImport: {
      filePath: readText(importSettings, 'filePath'),
      sheetName: readText(importSettings, 'sheetName'),
      headerRow: readHeaderRow(importSettings),
      idCol: readColumn(importSettings, 'idCol'),
      nameCol: readColumn(importSettings, 'nameCol'),
      detailCol: readColumn(importSettings, 'detailCol'),
      vehicleStartCol: readColumn(importSettings, 'vehicleStartCol'),
    },
  }
}

/**
 * 读取项目设置。
 *
 * 文件不存在 → 默认值（还没配置过）；存在但解析或结构不可用 → 默认值 + error，
 * 界面照常可用，提示用户去设置页重填。
 */
export function readSettings(projectPath: string): SettingsLoadOutcome {
  const targetPath = settingsFilePath(projectPath)

  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(targetPath, 'utf8'))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { document: defaultsDocument() }
    return {
      document: defaultsDocument(),
      error: `设置文件无法解析，已按默认值处理（${targetPath}）`,
    }
  }

  if (!isRecord(raw)) {
    return { document: defaultsDocument(), error: `设置结构不正确，已按默认值处理（${targetPath}）` }
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return {
      document: defaultsDocument(),
      error: `设置结构版本 ${String(raw.schemaVersion)} 不受支持（当前为 ${SCHEMA_VERSION}），已按默认值处理`,
    }
  }
  if (typeof raw.updatedAt !== 'string') {
    return { document: defaultsDocument(), error: `设置结构不正确，已按默认值处理（${targetPath}）` }
  }

  try {
    return {
      document: {
        schemaVersion: SCHEMA_VERSION,
        updatedAt: raw.updatedAt,
        settings: sanitizeSettings(raw.settings),
      },
    }
  } catch (error) {
    return {
      document: defaultsDocument(),
      error: `${error instanceof Error ? error.message : String(error)}，已按默认值处理`,
    }
  }
}

/** 写入整份设置；目录不存在时自动创建 */
export function writeSettings(projectPath: string, settings: ProjectSettings): SettingsSavedState {
  const normalized = sanitizeSettings(settings)
  const targetPath = settingsFilePath(projectPath)
  const updatedAt = new Date().toISOString()

  const document: ProjectSettingsDocument = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt,
    settings: normalized,
  }

  mkdirSync(dirname(targetPath), { recursive: true })
  writeFileSync(targetPath, JSON.stringify(document, null, 2), 'utf8')

  return { filePath: targetPath, updatedAt }
}
