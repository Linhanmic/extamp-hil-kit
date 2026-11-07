/**
 * 业务数据的读取与解析（主进程侧）：出声位置、音量表、SLOT 映射、扬声器快照。
 *
 * 这些数据都由项目设置里的路径指向（空表示「还没配置」），相对路径按项目根解析。
 * 它们只做展示、不需要写回，因此这里只有读取，没有「读 → 改 → 写」的编辑器模型。
 *
 * 解析函数都是纯函数（文本进、结构出），便于单测；读取函数负责解析路径 + 读文件，
 * 文件缺失按「空数据」处理，只有文件存在但读不了 / 解析不了才报 error。
 */
import { readFileSync, readdirSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import type {
  OutputDocument,
  OutputLoadOutcome,
  OutputScenario,
  SlotMappingDocument,
  SlotMappingEntry,
  SlotMappingLoadOutcome,
  SnapshotChannel,
  SnapshotDocument,
  SnapshotLoadOutcome,
  VolumeTableDocument,
  VolumeTableLoadOutcome,
  VolumeTableRow,
} from '../src/models'
import { resolveProjectPath } from './settings-store'

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT'
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 拆掉 BOM、按行切分，去掉首尾空白与空行 */
function readLines(text: string): string[] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/* ------------------------------------------------------------------ */
/* 出声位置                                                           */
/* ------------------------------------------------------------------ */

/**
 * 解析出声位置文本：`#` 开一行新场景，`适用车型:` 行给场景标车型，
 * `*` 开头的行按是否含 `|` 分成「出声扬声器列表」或「检查步骤」。
 */
export function parseOutputText(text: string): OutputScenario[] {
  const scenarios: OutputScenario[] = []
  let current: OutputScenario | null = null

  for (const line of readLines(text)) {
    if (line.startsWith('#')) {
      if (current) scenarios.push(current)
      current = { title: line.slice(1).trim(), vehicles: [], steps: [], speakers: [] }
      continue
    }
    if (!current) current = { title: '', vehicles: [], steps: [], speakers: [] }

    if (line.startsWith('适用车型:')) {
      current.vehicles = line
        .slice('适用车型:'.length)
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter((item) => item !== '')
      continue
    }
    if (line.startsWith('*')) {
      const body = line.slice(1).trim()
      if (body.includes('|')) {
        current.speakers = body
          .split('|')
          .map((item) => item.trim())
          .filter((item) => item !== '')
      } else {
        current.steps.push(body)
      }
      continue
    }
    current.steps.push(line)
  }
  if (current) scenarios.push(current)
  return scenarios
}

/* ------------------------------------------------------------------ */
/* 音量表                                                             */
/* ------------------------------------------------------------------ */

function detectDelimiter(line: string): string {
  const candidates = [';', ',', '\t']
  let best = ','
  let bestCount = -1
  for (const delimiter of candidates) {
    const count = line.split(delimiter).length - 1
    if (count > bestCount) {
      bestCount = count
      best = delimiter
    }
  }
  return best
}

/** 简单 CSV 切分：去掉首尾空白与成对引号，足够音量表这种无内嵌分隔符的表格 */
function splitCells(line: string, delimiter: string): string[] {
  return line
    .split(delimiter)
    .map((cell) => cell.trim().replace(/^"(.*)"$/, '$1'))
}

/**
 * 解析音量表文本：首行是表头（车型 / 音源 + 各音量档位），其余行是数据。
 * 分隔符按表头自动识别（`;` / `,` / Tab）。
 */
export function parseVolumeTableText(text: string): VolumeTableDocument {
  const lines = readLines(text)
  if (!lines.length) return { levels: [], rows: [] }

  const delimiter = detectDelimiter(lines[0])
  const header = splitCells(lines[0], delimiter)
  const vehicleIndex = header.indexOf('车型')
  const sourceIndex = header.indexOf('音源')
  const levelIndices = header
    .map((_, index) => index)
    .filter((index) => index !== vehicleIndex && index !== sourceIndex)

  const rows: VolumeTableRow[] = []
  for (const line of lines.slice(1)) {
    const cells = splitCells(line, delimiter)
    if (cells.every((cell) => cell === '')) continue
    rows.push({
      vehicle: vehicleIndex >= 0 ? (cells[vehicleIndex] ?? '') : (cells[0] ?? ''),
      source: sourceIndex >= 0 ? (cells[sourceIndex] ?? '') : (cells[1] ?? ''),
      values: levelIndices.map((index) => cells[index] ?? ''),
    })
  }

  return {
    levels: levelIndices.map((index) => header[index] ?? ''),
    rows,
  }
}

/* ------------------------------------------------------------------ */
/* SLOT 映射                                                          */
/* ------------------------------------------------------------------ */

/** 解析 mapping.ini：每行 `车型=slot 文件路径`，跳过空行与注释 */
export function parseSlotMappingText(text: string): { vehicle: string; path: string }[] {
  const entries: { vehicle: string; path: string }[] = []
  for (const line of readLines(text)) {
    if (line.startsWith('#') || line.startsWith(';')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const vehicle = line.slice(0, eq).trim()
    const path = line.slice(eq + 1).trim()
    if (vehicle && path) entries.push({ vehicle, path })
  }
  return entries
}

/* ------------------------------------------------------------------ */
/* 快照                                                               */
/* ------------------------------------------------------------------ */

/** 解析快照文件里的一行：`通道N对应扬声器名称`，拿不到通道号时按行序兜底 */
export function parseSnapshotText(text: string): SnapshotChannel[] {
  const channels: SnapshotChannel[] = []
  readLines(text).forEach((line, index) => {
    const match = line.match(/^通道\s*(\d+)\s*(?:对应|[:：=])?\s*(.*)$/)
    if (match) channels.push({ channel: `通道${match[1]}`, speaker: match[2] })
    else channels.push({ channel: `通道${index + 1}`, speaker: line })
  })
  return channels
}

/* ------------------------------------------------------------------ */
/* 读取：解析路径 + 读文件                                            */
/* ------------------------------------------------------------------ */

/** 读取出声位置文件 */
export function readOutput(projectPath: string, filePath = ''): OutputLoadOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { unconfigured: true }

  try {
    const scenarios = parseOutputText(readFileSync(target, 'utf8'))
    return { document: { scenarios } satisfies OutputDocument }
  } catch (error) {
    if (isMissing(error)) return { document: { scenarios: [] } }
    return { error: `出声位置文件无法读取（${target}）：${message(error)}` }
  }
}

/** 读取音量表文件 */
export function readVolumeTable(projectPath: string, filePath = ''): VolumeTableLoadOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { unconfigured: true }

  try {
    const document = parseVolumeTableText(readFileSync(target, 'utf8'))
    return { document }
  } catch (error) {
    if (isMissing(error)) return { document: { levels: [], rows: [] } }
    return { error: `音量表文件无法读取（${target}）：${message(error)}` }
  }
}

/** 读取 SLOT 映射配置及其指向的 slot 文件 */
export function readSlotMapping(projectPath: string, filePath = ''): SlotMappingLoadOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { unconfigured: true }

  let text: string
  try {
    text = readFileSync(target, 'utf8')
  } catch (error) {
    if (isMissing(error)) return { document: { entries: [] } }
    return { error: `SLOT 映射配置无法读取（${target}）：${message(error)}` }
  }

  const entries: SlotMappingEntry[] = parseSlotMappingText(text).map(({ vehicle, path }) => {
    // slot 文件路径同样允许绝对路径，或相对项目根（如 .\config\SLOT映射\xxx.txt）
    const slotPath = isAbsolute(path) ? path : resolve(projectPath, path.replace(/^[\\/]+/, ''))
    try {
      return { vehicle, filePath: slotPath, lines: readLines(readFileSync(slotPath, 'utf8')) }
    } catch (error) {
      if (isMissing(error)) return { vehicle, filePath: slotPath, lines: [], missing: true }
      throw error
    }
  })

  return { document: { entries } satisfies SlotMappingDocument }
}

/** 读取扬声器快照目录下的所有 txt 文件 */
export function readSnapshotDir(projectPath: string, dirPath = ''): SnapshotLoadOutcome {
  const target = resolveProjectPath(projectPath, dirPath)
  if (!target) return { unconfigured: true }

  let names: string[]
  try {
    names = readdirSync(target).filter((name) => /\.txt$/i.test(name)).sort()
  } catch (error) {
    if (isMissing(error)) return { document: { files: [] } }
    return { error: `扬声器快照目录无法读取（${target}）：${message(error)}` }
  }

  const files = names.map((name) => {
    let channels: SnapshotChannel[] = []
    try {
      channels = parseSnapshotText(readFileSync(join(target, name), 'utf8'))
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    return { name, channels }
  })

  return { document: { files } satisfies SnapshotDocument }
}
