/**
 * 需求分析表解析：把一张工作表读成的二维单元格矩阵解析成 Requirement + Variant。
 *
 * 纯函数模块——不读文件、不依赖 Electron。主进程用 SheetJS 读出矩阵后传进来，
 * 单元测试也可以直接构造矩阵调用（见 __tests__/requirements-parse.spec.ts）。
 *
 * 单元格约定（需求行 × 车型/适用范围列）：
 *   ●         适用，没有变体差异（需求原文直接落地）
 *   ●变体1    适用，变体描述就是「变体1」这个代号
 *   ●多行文本  适用，变体描述为「●」之后的全部文本（换行、标点原样保留）
 *   —         不适用
 *   空         未填写
 *
 * 变体的合并规则来自模型注释：先按 NFKC 归一，再抹掉控制字符、空白字符、
 * 标点符号得到 `key`，key 相同的单元格合并成同一个 Variant，原始描述进 `content`，
 * 车型进 `vehicles`——这样「除了控制字符其实一样」的变体不会重复膨胀。
 */
import type {
  Requirement,
  RequirementSheetColumn,
  RequirementSheetProbe,
  RequirementsColumnMapping,
  RequirementsParseResult,
  RequirementsParseStats,
  RequirementsParseWarning,
  Variant,
} from '../src/models/common'

/** SheetJS 读出的单元格取值：空单元格为 null */
export type SheetCell = string | number | boolean | null | undefined

/** 工作表内容：rows[r][c] 对应 Excel 的 (r + 1) 行、(c + 1) 列 */
export interface SheetTable {
  sheetName: string
  rows: SheetCell[][]
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** 1 基列号 → Excel 列字母（1 → A，27 → AA） */
export function columnIndexToLetter(index: number): string {
  let rest = index
  let letter = ''
  while (rest > 0) {
    const remainder = (rest - 1) % 26
    letter = LETTERS.charAt(remainder) + letter
    rest = Math.floor((rest - 1) / 26)
  }
  return letter || 'A'
}

/** 列配置取值 → 1 基列号：数字按列号，字符串按 Excel 列字母 */
export function columnRefToIndex(ref: string | number): number {
  if (typeof ref === 'number') {
    if (!Number.isInteger(ref) || ref < 1) throw new Error(`列号无效：${ref}`)
    return ref
  }
  const letters = ref.trim().toUpperCase()
  if (!/^[A-Z]+$/.test(letters)) throw new Error(`列号无效：${ref}`)
  let index = 0
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index
}

// 表头同义词：不同版本的需求表列名略有差异
const HEADER_ALIASES = {
  id: ['需求id', '需求编号', '需求号'],
  name: ['需求名称', '需求名', '需求标题'],
  detail: ['需求详情', '需求描述', '需求说明', '需求内容'],
}

// 这些字符写在单元格最前面表示「适用」，其后才是变体描述
const APPLICABLE_BULLETS = '●•·▪◦◾∙○'

// 只写这些内容的单元格表示「不适用」
const NOT_APPLICABLE_MARKS = new Set([
  '—',
  '–',
  '－',
  '-',
  '--',
  '——',
  '/',
  '\\',
  '×',
  '✕',
  '✗',
  '✘',
  'n/a',
  'na',
  '不适用',
])

const MAX_WARNINGS = 200

// 表头含「平台」的列是平台列，解析时整列忽略，不进车型清单
const PLATFORM_KEYWORD = '平台'
// 一个表头里可以写多款车型（与 tauri-app 的需求表解析规则一致）
const VEHICLE_SEPARATORS = /[/、,，;；]/
// 连续这么多个空表头就认为车型列区间结束
const MAX_EMPTY_HEADERS = 2

type CellMark =
  | { kind: 'blank' }
  | { kind: 'notApplicable' }
  | { kind: 'applicable'; text: string; marked: boolean }

/** 归类单元格：空白 / 不适用 / 适用（带变体描述或不带） */
export function classifyCell(value: SheetCell): CellMark {
  if (value === null || value === undefined) return { kind: 'blank' }
  const raw = String(value)
    .replace(/\u00a0/g, ' ')
    .trim()
  if (!raw) return { kind: 'blank' }
  if (APPLICABLE_BULLETS.includes(raw.charAt(0))) {
    return { kind: 'applicable', text: raw.slice(1).trim(), marked: true }
  }
  if (NOT_APPLICABLE_MARKS.has(raw.toLowerCase())) return { kind: 'notApplicable' }
  return { kind: 'applicable', text: raw, marked: false }
}

const KEY_STRIP = /[\p{Cc}\p{Cf}\p{Z}\p{P}]/gu

/** 变体内容键：NFKC 归一后去掉控制字符、空白字符与标点符号 */
export function variantKey(text: string): string {
  return text.normalize('NFKC').replace(KEY_STRIP, '')
}

function cellText(row: SheetCell[], index: number): string {
  const value = row[index - 1]
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/\u00a0/g, ' ')
    .trim()
}

function normalizeHeader(text: string): string {
  return text.replace(/[\s\u3000:：、,，.。()（）[\]【】]/g, '').toLowerCase()
}

function matchesHeader(header: string, aliases: string[]): boolean {
  const normalized = normalizeHeader(header)
  if (!normalized) return false
  return aliases.some((alias) => normalized === alias || normalized.startsWith(alias))
}

/** 从表头行里找出第一个匹配该同义词组合的列号；找不到返回 0 */
function findHeaderColumn(row: SheetCell[], aliases: string[]): number {
  for (let column = 1; column <= row.length; column++) {
    if (matchesHeader(cellText(row, column), aliases)) return column
  }
  return 0
}

export interface SheetProbeResult {
  probe?: RequirementSheetProbe
  error?: string
}

/**
 * 探测表头行与列位置，供导入界面预填列配置。
 *
 * 表头行默认取「同时含需求ID列与需求名称列」的第一行；车型起始列取详情列之后
 * 第一个表头含「平台」或数据区出现 ● / — 标记的列——功能安全这类夹在中间、
 * 只写 QM/ASIL 的列因此不会被误判成车型列。
 */
export function probeSheet(table: SheetTable, preferredHeaderRow?: number): SheetProbeResult {
  const { rows } = table
  if (!rows.length) return { error: '工作表里没有内容' }

  const headerRow = locateHeaderRow(rows, preferredHeaderRow)
  if (!headerRow) {
    return { error: '没找到表头行：前 30 行里没有「需求ID」列，请手动填写表头行号' }
  }

  const headerRowCells = rows[headerRow - 1] ?? []
  const notes: string[] = []

  const idCol = findHeaderColumn(headerRowCells, HEADER_ALIASES.id)
  if (!idCol) return { error: `第 ${headerRow} 行没有「需求ID」列` }

  let nameCol = findHeaderColumn(headerRowCells, HEADER_ALIASES.name)
  if (!nameCol) {
    nameCol = idCol + 1
    notes.push(`没有找到「需求名称」列，暂按 ${columnIndexToLetter(nameCol)} 列处理`)
  }

  let detailCol = findHeaderColumn(headerRowCells, HEADER_ALIASES.detail)
  if (!detailCol) {
    detailCol = nameCol + 1
    notes.push(`没有找到「需求详情」列，暂按 ${columnIndexToLetter(detailCol)} 列处理`)
  }

  const vehicleStartCol = guessVehicleStart(rows, headerRow, detailCol)
  if (vehicleStartCol === detailCol + 1) {
    notes.push(`车型列暂按 ${columnIndexToLetter(vehicleStartCol)} 列起算，请核对是否符合预期`)
  }

  return {
    probe: {
      sheetName: table.sheetName,
      rowCount: rows.length,
      headerRow,
      // 列位置统一用 Excel 列字母回给界面，与手动填写的列输入框保持一致
      mapping: {
        headerRow,
        idCol: columnIndexToLetter(idCol),
        nameCol: columnIndexToLetter(nameCol),
        detailCol: columnIndexToLetter(detailCol),
        vehicleStartCol: columnIndexToLetter(vehicleStartCol),
      },
      columns: describeColumns(rows, headerRow),
      notes,
    },
  }
}

function locateHeaderRow(rows: SheetCell[][], preferredHeaderRow?: number): number {
  if (preferredHeaderRow && preferredHeaderRow >= 1 && preferredHeaderRow <= rows.length) {
    const row = rows[preferredHeaderRow - 1] ?? []
    if (findHeaderColumn(row, HEADER_ALIASES.id)) return preferredHeaderRow
  }
  const limit = Math.min(rows.length, 30)
  let fallback = 0
  for (let rowIndex = 1; rowIndex <= limit; rowIndex++) {
    const row = rows[rowIndex - 1] ?? []
    if (!findHeaderColumn(row, HEADER_ALIASES.id)) continue
    if (!fallback) fallback = rowIndex
    // 同时带需求名称列的表头行更可信，优先返回
    if (findHeaderColumn(row, HEADER_ALIASES.name)) return rowIndex
  }
  return fallback
}

function guessVehicleStart(rows: SheetCell[][], headerRow: number, detailCol: number): number {
  const lastColumn = rows.reduce((widest, row) => Math.max(widest, row.length), 0)
  const headerRowCells = rows[headerRow - 1] ?? []

  // 1) 表头带「平台」的列——需求表里平台列总排在具体车型之前
  for (let column = detailCol + 1; column <= lastColumn; column++) {
    if (cellText(headerRowCells, column).includes('平台')) return column
  }

  // 2) 第一个出现 ● / — 标记的列。功能安全这类只写 QM / ASIL 等级的列没有标记，会被跳过
  for (let column = detailCol + 1; column <= lastColumn; column++) {
    for (let rowIndex = headerRow + 1; rowIndex <= rows.length; rowIndex++) {
      const mark = classifyCell((rows[rowIndex - 1] ?? [])[column - 1])
      if (mark.kind === 'notApplicable' || (mark.kind === 'applicable' && mark.marked))
        return column
    }
  }

  return detailCol + 1
}

function describeColumns(rows: SheetCell[][], headerRow: number): RequirementSheetColumn[] {
  const lastColumn = rows.reduce((widest, row) => Math.max(widest, row.length), 0)
  const columns: RequirementSheetColumn[] = []
  for (let column = 1; column <= lastColumn; column++) {
    const stats = { applicableCells: 0, notApplicableCells: 0, textCells: 0 }
    for (let rowIndex = headerRow + 1; rowIndex <= rows.length; rowIndex++) {
      const mark = classifyCell((rows[rowIndex - 1] ?? [])[column - 1])
      if (mark.kind === 'applicable') {
        if (mark.marked) stats.applicableCells++
        else stats.textCells++
      } else if (mark.kind === 'notApplicable') {
        stats.notApplicableCells++
      }
    }
    columns.push({
      index: column,
      letter: columnIndexToLetter(column),
      header: cellText(rows[headerRow - 1] ?? [], column),
      isPlatform: cellText(rows[headerRow - 1] ?? [], column).includes(PLATFORM_KEYWORD),
      ...stats,
    })
  }
  return columns
}

/**
 * 解析需求行。
 *
 * 需求ID相同视为同一条需求的补充行（真实需求表常把一条需求的适用情况拆成多行），
 * 合并时变体按 key 累加车型与原始描述。缺需求ID的行跳过并在告警里说明。
 */
export function parseRequirements(
  table: SheetTable,
  mapping: RequirementsColumnMapping,
): RequirementsParseResult {
  const idCol = columnRefToIndex(mapping.idCol)
  const nameCol = columnRefToIndex(mapping.nameCol)
  const detailCol = columnRefToIndex(mapping.detailCol)
  const vehicleStartCol = columnRefToIndex(mapping.vehicleStartCol)
  const headerRow = mapping.headerRow

  if (!Number.isInteger(headerRow) || headerRow < 1) throw new Error(`表头行号无效：${headerRow}`)
  if (headerRow > table.rows.length) throw new Error(`表头行号 ${headerRow} 超出了工作表行数`)
  if (vehicleStartCol <= detailCol) throw new Error('车型起始列必须在需求详情列之后')

  const dataRows = table.rows.slice(headerRow)
  const lastColumn = table.rows.reduce((widest, row) => Math.max(widest, row.length), 0)

  const vehicles = scanVehicleColumns(table, headerRow, vehicleStartCol, lastColumn)

  const requirements = new Map<string, Requirement>()
  const variantMaps = new Map<string, Map<string, Variant>>()
  const warnings: RequirementsParseWarning[] = []
  const stats: RequirementsParseStats = {
    dataRows: dataRows.length,
    blankRows: 0,
    skippedRows: 0,
    mergedRows: 0,
    requirementCount: 0,
    variantCount: 0,
    vehicleCount: vehicles.names.length,
    applicableCells: 0,
    notApplicableCells: 0,
    textCells: 0,
  }

  const warn = (row: number, message: string) => {
    if (warnings.length >= MAX_WARNINGS) return
    warnings.push({ row, message })
  }

  dataRows.forEach((row, offset) => {
    const rowNumber = headerRow + offset + 1
    const id = cellText(row, idCol)
    const name = cellText(row, nameCol)
    const detail = cellText(row, detailCol)

    if (!id) {
      if (!name && !detail && !hasAnyMark(row, vehicles.columns)) {
        stats.blankRows++
        return
      }
      stats.skippedRows++
      warn(rowNumber, `缺少需求ID，整行已跳过${name ? `（需求名称：${name}）` : ''}`)
      return
    }

    let requirement = requirements.get(id)
    if (requirement) {
      stats.mergedRows++
      if (!requirement.name && name) requirement.name = name
      if (!requirement.detail && detail) requirement.detail = detail
    } else {
      requirement = { id, name, detail, variants: [] }
      requirements.set(id, requirement)
      variantMaps.set(id, new Map())
    }

    const variantMap = variantMaps.get(id) as Map<string, Variant>
    let applicableInRow = 0

    for (const column of vehicles.columns) {
      const mark = classifyCell(row[column.index - 1])
      if (mark.kind === 'blank') continue
      if (mark.kind === 'notApplicable') {
        stats.notApplicableCells++
        continue
      }

      stats.applicableCells++
      applicableInRow++
      if (!mark.marked) {
        stats.textCells++
        warn(rowNumber, `${columnLabel(column)} 列的单元格没有以「●」开头，已按变体描述处理`)
      }

      const key = variantKey(mark.text)
      let variant = variantMap.get(key)
      if (!variant) {
        variant = { requirement_id: id, key, content: [], vehicles: [] }
        variantMap.set(key, variant)
        requirement.variants.push(variant)
        stats.variantCount++
      }
      if (mark.text && !variant.content.includes(mark.text)) variant.content.push(mark.text)
      // 一个车型列的表头可以写多款车型，单元格对这几款都成立
      for (const name of column.names) {
        if (!variant.vehicles.includes(name)) variant.vehicles.push(name)
      }
    }

    if (!applicableInRow) {
      warn(rowNumber, '这一行没有任何适用车型（单元格均为「—」或空）')
    }
  })

  stats.requirementCount = requirements.size

  return {
    vehicles: vehicles.names,
    requirements: [...requirements.values()],
    stats,
    warnings,
  }
}

interface VehicleColumn {
  index: number
  names: string[]
}

interface VehicleScan {
  columns: VehicleColumn[]
  /** 表头含「平台」的列：不是车型列，解析时整列忽略 */
  platformColumns: number[]
  /** 全部车型名，按首次出现顺序去重 */
  names: string[]
}

/**
 * 扫描车型列：从车型起始列向右读表头。
 *
 * - 空表头：单个跳过、继续向右；连续 2 个空表头则停止扫描（右侧是备注之类的杂物列）。
 * - 表头含「平台」：记入平台列，**不算车型列**，该列在解析时整列忽略。
 * - 其余非空表头：按 `/、,，;；` 拆成多个车型名并归一化。
 */
function scanVehicleColumns(
  table: SheetTable,
  headerRow: number,
  vehicleStartCol: number,
  lastColumn: number,
): VehicleScan {
  const headerRowCells = table.rows[headerRow - 1] ?? []
  const columns: VehicleColumn[] = []
  const platformColumns: number[] = []
  const names: string[] = []
  let emptyStreak = 0

  for (let column = vehicleStartCol; column <= lastColumn; column++) {
    const header = cellText(headerRowCells, column)
    if (!header) {
      emptyStreak++
      if (emptyStreak >= MAX_EMPTY_HEADERS) break
      continue
    }
    emptyStreak = 0

    if (header.includes(PLATFORM_KEYWORD)) {
      platformColumns.push(column)
      continue
    }

    const columnNames = splitVehicleNames(header)
    if (!columnNames.length) continue
    columns.push({ index: column, names: columnNames })
    for (const name of columnNames) {
      if (!names.includes(name)) names.push(name)
    }
  }

  return { columns, platformColumns, names }
}

/** 车型名归一化：去引号、去空白（含 NBSP 与全角空格）、下划线换算成连字符 */
function normalizeVehicleName(raw: string): string {
  return raw
    .replace(/["'`＂＇]/g, '')
    .replace(/\s/g, '')
    .replace(/_/g, '-')
}

function splitVehicleNames(header: string): string[] {
  const parts = header.split(VEHICLE_SEPARATORS).map(normalizeVehicleName).filter(Boolean)
  // 表头只有分隔符时退回整体归一化
  if (parts.length) return parts
  const whole = normalizeVehicleName(header)
  return whole ? [whole] : []
}

function columnLabel(column: VehicleColumn): string {
  return column.names.join('/') || `列${columnIndexToLetter(column.index)}`
}

function hasAnyMark(row: SheetCell[], columns: VehicleColumn[]): boolean {
  return columns.some((column) => classifyCell(row[column.index - 1]).kind !== 'blank')
}
