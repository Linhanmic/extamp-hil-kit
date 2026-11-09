/**
 * Gauge spec 文件的解析与场景标签更新。
 *
 * 结构规则对齐 Gauge 解析器（见 E:\oss\gauge\parser\lex.go）：
 *   - 场景标题：`##` 开头且第三字符不是 `#`（`##foo` 也算，`###` 不算）；也支持下划线式
 *     （上一行文字 + `---`）。规格书标题：`#` 开头且第二字符不是 `#`（或下划线式 `===`）。
 *   - 标签行：以 `tags:` 或 `tags :` 开头（不区分大小写）；逗号结尾可续行，直到某行不再
 *     以逗号结尾或遇到结构性行。首个场景之前的是规格书级标签，之后归属所在场景。
 *   - 本项目扩展的 `适用条件:` 指令行：出现在首个场景之前作用于整份规格书，之后作用于该场景。
 *
 * 更新逻辑只重写各场景的 `tags:` 行，不动 `适用条件:` 与正文，保持行尾风格不变：
 *   1. 算出场景适用车型（规格书条件 ∩ 场景条件）。
 *   2. tags 行整行清除后重写：原有标签（含手工标签）全部丢弃，只写算出的车型。
 *   3. 没有车型适用时标签内容改为 `不适用`。
 *   4. 没有标签的场景在标题（或适用条件）之后补一行；多行 / 多段标签合并为一行。
 *
 * 全部是纯函数（文本进、文本出），便于单测。
 */
import { evaluateCondition, type VehicleResolver } from './condition'

export interface SpecScenario {
  heading: string
  /** 场景级适用条件原文，未填写为 null */
  condition: string | null
  /** 现有场景标签（多行标签已合并） */
  tags: string[]
  headingIndex: number
  conditionIndex: number | null
  /** 该场景所有标签行（含续行）的行号，用于整体替换 */
  tagLineIndices: number[]
}

export interface ParsedSpec {
  /** 规格书级适用条件原文，未填写为 null */
  specCondition: string | null
  scenarios: SpecScenario[]
  /** 原始行（不含行尾符） */
  lines: string[]
  /** 检测到的行尾符 */
  eol: string
}

export interface TagChange {
  scenarioHeading: string
  scenarioIndex: number
  before: string[]
  after: string[]
}

export interface SpecAnalysis {
  parsed: ParsedSpec
  /** 每个场景最终适用的车型（规格书 ∩ 场景），按 universe 顺序 */
  vehicles: string[][]
  /** 解析 / 求值过程中的提示（失效引用、条件写法有误） */
  warnings: string[]
  changes: TagChange[]
  /** 带新标签的完整文件内容 */
  newText: string
  changed: boolean
}

const CONDITION_PATTERN = /^适用条件\s*[:：]\s*(.*)$/

/** Gauge parser/lex.go: isScenarioHeading —— `##` 开头且第三字符不是 `#` */
export function isScenarioHeading(trimmed: string): boolean {
  if (trimmed.length > 2) {
    return trimmed[0] === '#' && trimmed[1] === '#' && trimmed[2] !== '#'
  }
  return trimmed.length === 2 && trimmed[0] === '#' && trimmed[1] === '#'
}

/** Gauge parser/lex.go: isSpecHeading —— `#` 开头且第二字符不是 `#` */
export function isSpecHeading(trimmed: string): boolean {
  if (trimmed.length > 1) return trimmed[0] === '#' && trimmed[1] !== '#'
  return trimmed.length === 1 && trimmed[0] === '#'
}

/** Gauge parser/lex.go: isUnderline —— 整行同一字符（`=` 规格书 / `-` 场景 / `_` 拆卸） */
function isUnderline(trimmed: string, char: string): boolean {
  return trimmed.length > 0 && [...trimmed].every((c) => c === char)
}

/** Gauge parser/lex.go: checkTag —— 行首为 `tags:` 或 `tags :`（不区分大小写），返回前缀长度 */
export function tagPrefixLength(trimmed: string): number {
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('tags:')) return 5
  if (lower.startsWith('tags :')) return 6
  return -1
}

/** 会打断标签续行的结构性行：步骤 / 表格 / 数据表 / 拆卸 / 适用条件指令 */
function isBlockerLine(trimmed: string): boolean {
  if (trimmed.startsWith('*') && !(trimmed.length > 1 && trimmed[1] === '*')) return true
  if (trimmed.startsWith('|') && trimmed.endsWith('|')) return true
  if (/^[tT][aA][bB][lL][eE]\s*:/.test(trimmed)) return true
  if (isUnderline(trimmed, '_')) return true
  return CONDITION_PATTERN.test(trimmed)
}

/** 结构性行：标题 / 下划线 / 标签 / 步骤表格等，不能当作文本或下划线式标题 */
function isStructuralLine(trimmed: string): boolean {
  if (isScenarioHeading(trimmed) || isSpecHeading(trimmed)) return true
  if (isUnderline(trimmed, '=') || isUnderline(trimmed, '-') || isUnderline(trimmed, '_')) {
    return true
  }
  if (tagPrefixLength(trimmed) >= 0) return true
  return isBlockerLine(trimmed)
}

function splitLines(text: string): { lines: string[]; eol: string } {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  return { lines: text.split(/\r\n|\n|\r/), eol }
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '')
}

function dedupe(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index)
}

/**
 * 标出所有标题行（ATX 与下划线式）。
 * 下划线式把 `===` / `---` 上方那行文字转成标题，与 Gauge 的 commentScope 行为一致。
 */
function findHeadings(lines: string[]): Map<number, { kind: 'spec' | 'scenario'; text: string }> {
  const headings = new Map<number, { kind: 'spec' | 'scenario'; text: string }>()
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? '').trim()
    if (isScenarioHeading(trimmed)) {
      headings.set(i, { kind: 'scenario', text: trimmed.slice(2).trim() })
    } else if (isSpecHeading(trimmed)) {
      headings.set(i, { kind: 'spec', text: trimmed.slice(1).trim() })
    } else if (isUnderline(trimmed, '=') || isUnderline(trimmed, '-')) {
      const above = i > 0 ? (lines[i - 1] ?? '').trim() : ''
      if (above !== '' && !isStructuralLine(above)) {
        const kind = isUnderline(trimmed, '=') ? 'spec' : 'scenario'
        headings.set(i - 1, { kind, text: above })
      }
    }
  }
  return headings
}

/** 解析 spec 文本：抽出规格书级 / 场景级适用条件与场景标签，并记下行号 */
export function parseSpec(text: string): ParsedSpec {
  const { lines, eol } = splitLines(text)
  const headings = findHeadings(lines)
  let specCondition: string | null = null
  const scenarios: SpecScenario[] = []
  let current: SpecScenario | null = null
  let tagBlockOpen = false // 上一标签行以逗号结尾，可续行

  lines.forEach((line, index) => {
    const trimmed = line.trim()

    const heading = headings.get(index)
    if (heading) {
      tagBlockOpen = false
      if (heading.kind === 'scenario') {
        current = {
          heading: heading.text,
          condition: null,
          tags: [],
          headingIndex: index,
          conditionIndex: null,
          tagLineIndices: [],
        }
        scenarios.push(current)
      }
      return
    }

    const conditionMatch = trimmed.match(CONDITION_PATTERN)
    if (conditionMatch) {
      tagBlockOpen = false
      const value = (conditionMatch[1] ?? '').trim()
      if (current) {
        current.condition = value || null
        current.conditionIndex = index
      } else if (specCondition === null) {
        specCondition = value || null
      }
      return
    }

    const isTagLine = tagPrefixLength(trimmed) >= 0
    const isContinuation = tagBlockOpen && trimmed !== '' && !isBlockerLine(trimmed)
    if (isTagLine || isContinuation) {
      const value = isTagLine ? trimmed.slice(tagPrefixLength(trimmed)).trim() : trimmed
      const tags = splitTags(value)
      if (current) {
        current.tags.push(...tags)
        current.tagLineIndices.push(index)
      }
      // 逗号结尾则继续续行；否则标签块结束
      tagBlockOpen = trimmed.endsWith(',')
      return
    }

    tagBlockOpen = false
  })

  return { specCondition, scenarios, lines, eol }
}

/**
 * 按算好的车型更新场景标签。
 *
 * 只重写各场景的 `tags:` 行，且整行重写：原有标签一律清除，只写本功能算出的车型；
 * 没有车型适用时写 `不适用`，因此重复执行是幂等的且不会残留旧车型。多行 / 多段标签
 * 会合并为一行。
 */
export function updateSpecTags(
  parsed: ParsedSpec,
  vehiclesFor: (scenario: SpecScenario, index: number) => string[],
): { text: string; changes: TagChange[]; changed: boolean } {
  const changes: TagChange[] = []
  const deleteSet = new Set<number>()
  const replaceMap = new Map<number, string>()
  const insertMap = new Map<number, string>()

  parsed.scenarios.forEach((scenario, index) => {
    const vehicles = vehiclesFor(scenario, index)
    const newTags = dedupe(vehicles.length ? vehicles : ['不适用'])
    const tagLine = `tags: ${newTags.join(', ')}`
    changes.push({
      scenarioHeading: scenario.heading,
      scenarioIndex: index,
      before: scenario.tags,
      after: newTags,
    })

    const tagLines = scenario.tagLineIndices
    if (tagLines.length) {
      // 首个标签行就地替换，其余（续行 / 多段）删除
      const first = tagLines[0] as number
      replaceMap.set(first, tagLine)
      for (const idx of tagLines.slice(1)) deleteSet.add(idx)
    } else {
      const anchor = scenario.conditionIndex ?? scenario.headingIndex
      insertMap.set(anchor, tagLine)
    }
  })

  // 逐行重建，顺序天然自上而下，无需担心行号偏移
  const output: string[] = []
  parsed.lines.forEach((line, index) => {
    if (deleteSet.has(index)) return
    if (replaceMap.has(index)) {
      output.push(replaceMap.get(index) as string)
      return
    }
    output.push(line)
    if (insertMap.has(index)) output.push(insertMap.get(index) as string)
  })

  const text = output.join(parsed.eol)
  return { text, changes, changed: text !== parsed.lines.join(parsed.eol) }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 解析 + 求值 + 计算新标签的一站式纯函数。
 *
 * 适用条件写法有误时按「没有车型适用」处理并记入 warnings，不静默放行全量车型。
 */
export function analyzeSpec(
  text: string,
  resolver: VehicleResolver,
  universe: string[],
): SpecAnalysis {
  const parsed = parseSpec(text)
  const warnings: string[] = []

  const safeEvaluate = (expr: string | null): string[] => {
    try {
      return evaluateCondition(expr, resolver, universe, warnings)
    } catch (error) {
      warnings.push(`适用条件「${expr ?? ''}」解析失败：${message(error)}`)
      return []
    }
  }

  const specVehicles = safeEvaluate(parsed.specCondition)
  const vehicles: string[][] = parsed.scenarios.map((scenario) => {
    const scenarioVehicles = safeEvaluate(scenario.condition)
    const allowed = new Set(specVehicles)
    return scenarioVehicles.filter((vehicle) => allowed.has(vehicle))
  })

  const updated = updateSpecTags(parsed, (_scenario, index) => vehicles[index] ?? [])

  return {
    parsed,
    vehicles,
    warnings: dedupe(warnings),
    changes: updated.changes,
    newText: updated.text,
    changed: updated.changed,
  }
}
