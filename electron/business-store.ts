/**
 * 业务数据的读取与解析（主进程侧）：出声位置、音量表、SLOT 映射、扬声器快照。
 *
 * 这些数据都由项目设置里的路径指向（空表示「还没配置」），相对路径按项目根解析。
 * 它们只做展示、不需要写回，因此这里只有读取，没有「读 → 改 → 写」的编辑器模型。
 *
 * 解析函数都是纯函数（文本进、结构出），便于单测；读取函数负责解析路径 + 读文件，
 * 文件缺失按「空数据」处理，只有文件存在但读不了 / 解析不了才报 error。
 */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  OutputDocument,
  OutputLoadOutcome,
  OutputScenario,
  SlotMappingDocument,
  SlotMappingPlan,
  SlotMappingLoadOutcome,
  SlotMappingScenario,
  SnapshotDocument,
  SnapshotFile,
  SnapshotAppendOutcome,
  SnapshotLoadOutcome,
  VolumeTableDocument,
  VolumeTableLoadOutcome,
  VolumeTableSaveOutcome,
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
 * 解析出声位置文本：`#` 开新场景；适用车型按 /、逗号等拆分，未写表示全部车型。
 * 支持 speak="左前|中置" / no_speak='右前|重低音'；旧式 `* 左前|中置` 仍按出声关键字解析。
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
        .map((item) => item.trim())
        .filter(Boolean)
      continue
    }

    const body = line.startsWith('*') ? line.slice(1).trim() : line
    const directives = [...body.matchAll(/\b(no_speak|speak)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    for (const match of directives) {
      const content = match[2] ?? match[3] ?? ''
      appendKeywords(match[1] === 'speak' ? current.speakKeywords : current.noSpeakKeywords, content)
    }
    // 兼容旧文件：没有 speak= 的竖线列表仍是出声扬声器关键字
    if (!directives.length && line.startsWith('*') && body.includes('|')) {
      appendKeywords(current.speakKeywords, body)
      continue
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
      for (const vehicle of value.split(/[/、,，;；]/)) {
        const name = vehicle.trim()
        if (name && !vehicles.includes(name)) vehicles.push(name)
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
      const vehicles = name
        .split(/[/、,，;；]/)
        .map((vehicle) => vehicle.trim())
        .filter(Boolean)
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

/** 追加一个快照分节到 snapshot.ini 文件；保留原文件，拒绝同名分节 */
export function appendSnapshot(
  projectPath: string,
  filePath: string,
  section: string,
  speakers: string[],
): SnapshotAppendOutcome {
  const target = resolveProjectPath(projectPath, filePath)
  if (!target) return { unconfigured: true }

  const name = section.trim()
  if (!name || /[[\]\r\n]/.test(name)) return { error: '适用车型分节名称不正确' }
  const lines = speakers.map((speaker) => speaker.trim()).filter(Boolean)
  if (!lines.length) return { error: '至少填写一个扬声器' }

  try {
    let text = ''
    try {
      text = readFileSync(target, 'utf8')
    } catch (error) {
      if (!isMissing(error)) throw error
    }
    const sections = [...text.matchAll(/^\[([^\]]+)\]/gm)].map((match) => match[1]?.trim())
    if (sections.includes(name)) return { error: `分节「${name}」已存在` }

    const eol = text.includes('\r\n') ? '\r\n' : '\n'
    const addition = `${text.trimEnd() ? `${eol}${eol}` : ''}[${name}]${eol}${lines.join(eol)}${eol}`
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, `${text.trimEnd()}${addition}`, 'utf8')
    return { saved: { filePath: target, updatedAt: statSync(target).mtime.toISOString() } }
  } catch (error) {
    return { error: `快照写入失败：${message(error)}` }
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
