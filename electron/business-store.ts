/**
 * 业务数据的读写（主进程侧）：出声位置、音量表、SLOT 映射、扬声器快照。
 *
 * 这些数据都由项目设置里的路径指向（空表示「还没配置」），相对路径按项目根解析。
 * 四类资料都支持整份写回：结构化内容由渲染层序列化成文本，这里只做路径解析、
 * 合法性与越界校验以及落盘。
 *
 * 解析函数都是纯函数（文本进、结构出），便于单测；读取函数负责解析路径 + 读文件，
 * 文件缺失按「空数据」处理，只有文件存在但读不了 / 解析不了才报 error。
 */
import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import type {
  OutputDocument,
  OutputLoadOutcome,
  OutputSaveOutcome,
  OutputScenario,
  SlotMappingDocument,
  SlotMappingPlan,
  SlotMappingLoadOutcome,
  SlotMappingSaveOutcome,
  SlotMappingDeleteOutcome,
  SlotMappingScenario,
  SnapshotDocument,
  SnapshotFile,
  SnapshotSaveOutcome,
  SnapshotLoadOutcome,
  VolumeTableDocument,
  VolumeTableLoadOutcome,
  VolumeTableSaveOutcome,
  VolumeTableRow,
} from '../src/models'
import { resolveProjectPath } from './settings-store'
import { normalizeVehicleList, normalizeVehicleName } from '../src/shared/vehicle-name'

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
 * 解析出声位置文本：`#` 开新场景；适用车型按 /、逗号等拆分，未写表示全部车型。
 * 只从步骤行中提取 speak="左前|中置" / no_speak='右前|重低音'，其他写法都按普通步骤保留。
 */
export function parseOutputText(text: string): OutputScenario[] {
  const scenarios: OutputScenario[] = []
  let current: OutputScenario | null = null
  const createScenario = (title: string): OutputScenario => ({
    title,
    allVehicles: true,
    vehicles: [],
    steps: [],
    speakKeywords: [],
    noSpeakKeywords: [],
  })
  const appendKeywords = (target: string[], content: string) => {
    for (const keyword of content.split('|')) {
      const text = keyword.trim()
      if (text && !target.includes(text)) target.push(text)
    }
  }

  for (const line of readLines(text)) {
    if (line.startsWith('#')) {
      if (current) scenarios.push(current)
      current = createScenario(line.slice(1).trim())
      continue
    }
    if (!current) current = createScenario('')

    if (line.startsWith('适用车型:') || line.startsWith('适用车型：')) {
      current.allVehicles = false
      current.vehicles = line
        .slice('适用车型'.length + 1)
        .split(/[/、,，;；]/)
        .map((item) => normalizeVehicleName(item))
        .filter(Boolean)
      continue
    }

    const isStep = line.startsWith('*')
    const body = isStep ? line.slice(1).trim() : line
    const directives = isStep
      ? [...body.matchAll(/\b(no_speak|speak)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      : []
    for (const match of directives) {
      const content = match[2] ?? match[3] ?? ''
      appendKeywords(match[1] === 'speak' ? current.speakKeywords : current.noSpeakKeywords, content)
    }
    current.steps.push(body)
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
      vehicle: normalizeVehicleList(vehicleIndex >= 0 ? (cells[vehicleIndex] ?? '') : (cells[0] ?? '')).join('/'),
      source: sourceIndex >= 0 ? (cells[sourceIndex] ?? '') : (cells[1] ?? ''),
      values: levelIndices.map((index) => cells[index] ?? ''),
    })
  }

  return {
    levels: levelIndices.map((index) => header[index] ?? ''),
    rows,
  }
}

/** 整份写回音量表：沿用原分隔符；含分隔符或换行的单元格拒绝，避免破坏表格 */
export function writeVolumeTable(
  projectPath: string,
  filePath: string,
  document: VolumeTableDocument,
): VolumeTableSaveOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { error: '还没有配置音量表文件' }

  let delimiter = ';'
  try {
    const firstLine = readLines(readFileSync(target, 'utf8'))[0]
    if (firstLine) delimiter = detectDelimiter(firstLine)
  } catch (error) {
    if (!isMissing(error)) return { error: `音量表文件无法读取（${target}）：${message(error)}` }
  }

  const lines = [
    ['车型', '音源', ...document.levels],
    ...document.rows.map((row) => [row.vehicle, row.source, ...row.values]),
  ]
  for (const cells of lines) {
    if (cells.some((cell) => cell.includes(delimiter) || /[\r\n]/.test(cell))) {
      return { error: '车型、音源或 dB 值包含当前分隔符或换行，无法保存' }
    }
  }

  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, `${lines.map((cells) => cells.join(delimiter)).join('\n')}\n`, 'utf8')
    return { saved: { filePath: target, updatedAt: statSync(target).mtime.toISOString() } }
  } catch (error) {
    return { error: `音量表写入失败（${target}）：${message(error)}` }
  }
}

/* ------------------------------------------------------------------ */
/* SLOT 映射                                                          */
/* ------------------------------------------------------------------ */

/** 解析单个 SLOT 映射文件：首行适用车型，# 音源场景，* 步骤中的 SLOT数字为通道 */
export function parseSlotMappingFileText(text: string): {
  vehicles: string[]
  scenarios: SlotMappingScenario[]
} {
  const vehicles: string[] = []
  const scenarios: SlotMappingScenario[] = []
  let current: SlotMappingScenario | null = null

  for (const line of readLines(text)) {
    if (line.startsWith('适用车型:') || line.startsWith('适用车型：')) {
      const value = line.slice('适用车型'.length + 1)
      for (const vehicle of normalizeVehicleList(value)) {
        if (!vehicles.includes(vehicle)) vehicles.push(vehicle)
      }
      continue
    }
    if (line.startsWith('#')) {
      current = { title: line.slice(1).trim(), steps: [], slots: [], hasNonSlotSteps: false }
      scenarios.push(current)
      continue
    }
    if (!current || !line.startsWith('*')) continue

    current.steps.push(line.slice(1).trim())
    const matches = [...line.matchAll(/SLOT\s*(\d+)/gi)]
    for (const match of matches) {
      const slot = Number(match[1])
      if (!current.slots.includes(slot)) current.slots.push(slot)
    }
    if (!matches.length) current.hasNonSlotSteps = true
  }

  return { vehicles, scenarios }
}

/** 解析 SLOT 映射方案文件的目标路径：目录取设置里的 SLOT 映射目录，文件名必须是纯 .txt 名 */
function slotPlanTarget(
  projectPath: string,
  dirPath: string,
  fileName: string,
): { target?: string; error?: string } {
  const base = resolveProjectPath(projectPath, dirPath)
  if (!base) return { error: '还没有配置 SLOT 映射目录' }
  if (typeof fileName !== 'string' || !fileName || basename(fileName) !== fileName) {
    return { error: 'SLOT 映射方案文件名不正确' }
  }
  if (!fileName.toLowerCase().endsWith('.txt')) {
    return { error: 'SLOT 映射方案必须是 .txt 文件' }
  }
  return { target: join(base, fileName) }
}

/** 整份写回一个 SLOT 映射方案文件（新增与编辑共用） */
export function writeSlotPlan(
  projectPath: string,
  dirPath: string,
  fileName: string,
  text: string,
): SlotMappingSaveOutcome {
  const resolved = slotPlanTarget(projectPath, dirPath, fileName)
  if (!resolved.target) return { error: resolved.error ?? 'SLOT 映射方案路径不正确' }
  if (typeof text !== 'string') return { error: 'SLOT 映射方案内容不正确' }

  try {
    mkdirSync(dirname(resolved.target), { recursive: true })
    writeFileSync(resolved.target, text, 'utf8')
    return {
      saved: {
        filePath: resolved.target,
        updatedAt: statSync(resolved.target).mtime.toISOString(),
      },
    }
  } catch (error) {
    return { error: `SLOT 映射方案写入失败（${resolved.target}）：${message(error)}` }
  }
}

/** 删除一个 SLOT 映射方案文件 */
export function deleteSlotPlan(
  projectPath: string,
  dirPath: string,
  fileName: string,
): SlotMappingDeleteOutcome {
  const resolved = slotPlanTarget(projectPath, dirPath, fileName)
  if (!resolved.target) return { error: resolved.error ?? 'SLOT 映射方案路径不正确' }

  try {
    unlinkSync(resolved.target)
    return { deleted: true }
  } catch (error) {
    return { error: `SLOT 映射方案无法删除（${resolved.target}）：${message(error)}` }
  }
}

/* ------------------------------------------------------------------ */
/* 快照                                                               */
/* ------------------------------------------------------------------ */

/** 解析 snapshot.ini：每个 [适用车型] 分节一组，扬声器按非空行从通道 1 递增 */
export function parseSnapshotIniText(text: string): SnapshotFile[] {
  const files: SnapshotFile[] = []
  let current: SnapshotFile | null = null

  for (const line of readLines(text)) {
    const section = line.match(/^\[(.*)\]$/)
    if (section) {
      const name = section[1]?.trim() ?? ''
      if (!name) {
        current = null
        continue
      }
      const vehicles = normalizeVehicleList(name)
      current = { name, vehicles, channels: [] }
      files.push(current)
      continue
    }
    if (!current) continue

    // 行序就是通道号；兼容「通道N对应扬声器」写法，展示对应后的名称
    const speaker = line.replace(/^通道\s*\d+\s*对应\s*/, '').trim() || line
    current.channels.push({ channel: `通道${current.channels.length + 1}`, speaker })
  }

  return files
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

/** 整份写回出声位置文件（渲染层已按格式生成文本） */
export function writeOutput(
  projectPath: string,
  filePath: string,
  text: string,
): OutputSaveOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { error: '还没有配置出声位置文件' }
  if (typeof text !== 'string') return { error: '出声位置内容不正确' }

  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, text, 'utf8')
    return { saved: { filePath: target, updatedAt: statSync(target).mtime.toISOString() } }
  } catch (error) {
    return { error: `出声位置写入失败（${target}）：${message(error)}` }
  }
}

/** 读取音量表文件 */export function readVolumeTable(projectPath: string, filePath = ''): VolumeTableLoadOutcome {
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

/** 读取 SLOT 映射目录：目录下每个 txt 文件是一种映射方案 */
export function readSlotMapping(projectPath: string, dirPath = ''): SlotMappingLoadOutcome {
  const target = resolveProjectPath(projectPath, dirPath)
  if (!target) return { unconfigured: true }

  let files: string[]
  try {
    files = readdirSync(target, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.txt'))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (error) {
    if (isMissing(error)) return { document: { plans: [] } }
    return { error: `SLOT 映射目录无法读取（${target}）：${message(error)}` }
  }

  const plans: SlotMappingPlan[] = files.map((name) => {
    const filePath = join(target, name)
    try {
      const parsed = parseSlotMappingFileText(readFileSync(filePath, 'utf8'))
      return { name, filePath, ...parsed }
    } catch (error) {
      return {
        name,
        filePath,
        vehicles: [],
        scenarios: [],
        error: `映射文件无法读取：${message(error)}`,
      }
    }
  })

  return { document: { plans } satisfies SlotMappingDocument }
}

/** 整份写回 snapshot.ini（新增 / 编辑 / 删除分节都走这一条，文本由渲染层生成） */
export function writeSnapshotFile(
  projectPath: string,
  filePath: string,
  text: string,
): SnapshotSaveOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { unconfigured: true, error: '还没有配置扬声器快照文件' }
  if (typeof text !== 'string') return { error: '扬声器快照内容不正确' }

  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, text, 'utf8')
    return { saved: { filePath: target, updatedAt: statSync(target).mtime.toISOString() } }
  } catch (error) {
    return { error: `快照写入失败（${target}）：${message(error)}` }
  }
}
export function readSnapshotFile(projectPath: string, filePath = ''): SnapshotLoadOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { unconfigured: true }

  try {
    const files = parseSnapshotIniText(readFileSync(target, 'utf8'))
    return { document: { files } satisfies SnapshotDocument }
  } catch (error) {
    if (isMissing(error)) return { document: { files: [] } }
    return { error: `扬声器快照文件无法读取（${target}）：${message(error)}` }
  }
}
