/**
 * Gauge 封装（概念）.cpt 文件的解析与生成。
 *
 * 结构规则对齐 Gauge 解析器（见 E:\oss\gauge\parser\conceptParser.go 与 stepParser.go）：
 *   - 封装标题：`#` 开头且第二字符不是 `#`（`#foo` 也算，`##` 不算——那是场景标题，封装文件禁止）。
 *   - 步骤行：`*` 开头（`**` 不算步骤）。
 *   - 表格行：去空白后以 `|` 开头并以 `|` 结尾，挂在上一个步骤下；首行是表头，
 *     `|---|` 式分隔行可有可无，其余是数据行。
 *   - 其余行是注释：标题之前的是文件级注释，概念内部的注释在结构化编辑中不保留。
 *   - 标题只允许动态参数 `<参数名>`，不允许 `"静态值"` 或 `:特殊参数`。
 *   - 每个封装至少一步；步骤必须位于某个封装标题之下。
 *
 * 序列化 `serializeConcepts` 由结构化封装重新生成 .cpt 文本：注释与原始排版不保留，
 * 适合「表单编辑 → 落盘」的管理场景。全部是纯函数，便于单测。
 */

/** 封装内联表格 */
export interface ConceptTable {
  /** 表头（每列一格） */
  headers: string[]
  /** 数据行（每行与表头等长） */
  rows: string[][]
}

/** 封装内的一步 */
export interface ConceptStep {
  /** 步骤原文，含 `<参数>`、`"静态值"` 等占位，不含开头的 `*` */
  text: string
  /** 步骤后的内联表格，没有则为 null */
  table: ConceptTable | null
}

/** 一个封装（Gauge 概念） */
export interface Concept {
  /** 封装标题，含 `<参数>` 占位，不含开头的 `#` */
  heading: string
  /** 标题里的动态参数名（不含尖括号），由 heading 派生 */
  params: string[]
  steps: ConceptStep[]
}

/** 解析 / 校验提示 */
export interface ConceptIssue {
  /** 关联的封装标题；文件级问题为空字符串 */
  conceptHeading: string
  message: string
}

export interface ParsedConceptFile {
  concepts: Concept[]
  issues: ConceptIssue[]
  /** 原始行（不含行尾符） */
  lines: string[]
  /** 检测到的行尾符 */
  eol: string
}

/** 标题里的动态参数名：<foo> → foo */
export function extractParams(heading: string): string[] {
  const names: string[] = []
  const pattern = /<([^<>]+)>/g
  let match = pattern.exec(heading)
  while (match) {
    const name = (match[1] ?? '').trim()
    if (name && !names.includes(name)) names.push(name)
    match = pattern.exec(heading)
  }
  return names
}

/** 是否是封装标题行：`#` 开头且第二字符不是 `#` */
export function isConceptHeading(trimmed: string): boolean {
  if (trimmed.length > 1) return trimmed[0] === '#' && trimmed[1] !== '#'
  return trimmed.length === 1 && trimmed[0] === '#'
}

/** 是否是步骤行：`*` 开头，`**` 加粗不算 */
export function isConceptStepLine(trimmed: string): boolean {
  return trimmed.startsWith('*') && !(trimmed.length > 1 && trimmed[1] === '*')
}

/** 是否是表格行：去空白后以 | 开头并以 | 结尾 */
export function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length >= 2
}

/** 是否是表格分隔行：|---|---| */
function isTableSeparator(trimmed: string): boolean {
  if (!isTableRow(trimmed)) return false
  const cells = splitTableRow(trimmed)
  return cells.length > 0 && cells.every((cell) => cell !== '' && /^-+$/.test(cell))
}

/** 是否是场景标题：`##` 开头且第三字符不是 `#`（封装文件里不允许） */
function isScenarioHeading(trimmed: string): boolean {
  if (trimmed.length > 2) {
    return trimmed[0] === '#' && trimmed[1] === '#' && trimmed[2] !== '#'
  }
  return trimmed.length === 2 && trimmed[0] === '#' && trimmed[1] === '#'
}

function splitTableRow(trimmed: string): string[] {
  const inner = trimmed.slice(1, -1)
  return inner.split('|').map((cell) => cell.trim())
}

function splitLines(text: string): { lines: string[]; eol: string } {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  return { lines: text.split(/\r\n|\n|\r/), eol }
}

/** 参数括号是否配对：去掉合法的 <...> 后不应再有尖括号 */
function hasUnpairedParamBracket(text: string): boolean {
  const stripped = text.replace(/<[^<>]*>/g, '')
  return stripped.includes('<') || stripped.includes('>')
}

/** 标题参数合法性：只允许 <动态参数>，不允许 "静态" 或 :特殊 */
function headingIssues(heading: string): string[] {
  const issues: string[] = []
  if (heading.trim() === '') {
    issues.push('封装标题不能为空')
  }
  if (/"[^"]*"/.test(heading)) {
    issues.push('封装标题只能有动态参数 <参数名>，不能有 "静态值"')
  }
  if (/(^|\s):[^\s<"]+/.test(heading)) {
    issues.push('封装标题只能有动态参数 <参数名>，不能有 :特殊参数')
  }
  if (hasUnpairedParamBracket(heading)) {
    issues.push('封装标题的参数括号未配对（应写成 <参数名>）')
  }
  return issues
}

/** 步骤参数括号 / 引号是否配对（简单配对检查，与 Gauge 报错对齐） */
function stepIssues(text: string): string[] {
  const issues: string[] = []
  if (text.trim() === '') {
    issues.push('步骤不能为空')
  }
  if (hasUnpairedParamBracket(text)) {
    issues.push('步骤里的参数括号未配对（应写成 <参数名>）')
  }
  if ((text.match(/"/g) ?? []).length % 2 !== 0) {
    issues.push('步骤里的静态值引号未配对')
  }
  return issues
}

/** 解析 .cpt 文本：抽出封装、步骤、表格，并记下校验问题 */
export function parseConceptFile(text: string): ParsedConceptFile {
  const { lines, eol } = splitLines(text)
  const concepts: Concept[] = []
  const issues: ConceptIssue[] = []
  let current: Concept | null = null
  /** 当前步骤，表格挂到它下面 */
  let currentStep: ConceptStep | null = null
  /** 表格是否已读到表头 */
  let tableHeaderDone = false

  const closeTable = () => {
    currentStep = null
    tableHeaderDone = false
  }

  const pushIssue = (conceptHeading: string, message: string) => {
    issues.push({ conceptHeading, message })
  }

  for (const raw of lines) {
    const trimmed = raw.trim()

    // 空行：结束表格，不影响概念
    if (trimmed === '') {
      closeTable()
      continue
    }

    if (isScenarioHeading(trimmed)) {
      pushIssue(current?.heading ?? '', '封装文件不允许场景标题（##），请只用 # 封装标题')
      closeTable()
      continue
    }

    if (isConceptHeading(trimmed)) {
      // 收尾上一个：不足一步的在这里报错
      if (current && current.steps.length < 1) {
        pushIssue(current.heading, '封装至少需要一个步骤')
      }
      const heading = trimmed.replace(/^#/, '').trim()
      current = { heading, params: extractParams(heading), steps: [] }
      concepts.push(current)
      for (const message of headingIssues(heading)) pushIssue(heading, message)
      closeTable()
      continue
    }

    if (isConceptStepLine(trimmed)) {
      if (!current) {
        pushIssue('', `步骤「${trimmed}」不在任何封装标题下`)
        closeTable()
        continue
      }
      const text = trimmed.replace(/^\*\s?/, '').trim()
      currentStep = { text, table: null }
      current.steps.push(currentStep)
      tableHeaderDone = false
      for (const message of stepIssues(text)) pushIssue(current.heading, message)
      continue
    }

    if (isTableRow(trimmed)) {
      if (!currentStep) {
        pushIssue(current?.heading ?? '', `表格行「${trimmed}」不属于任何步骤`)
        continue
      }
      if (isTableSeparator(trimmed)) {
        // 分隔行不进数据，但算表格结构的一部分
        continue
      }
      const cells = splitTableRow(trimmed)
      if (!currentStep.table) {
        currentStep.table = { headers: cells, rows: [] }
        tableHeaderDone = true
      } else if (tableHeaderDone) {
        currentStep.table.rows.push(cells)
      }
      continue
    }

    // 注释行：结束当前表格；标题之前 / 概念之间的注释在结构化模型里不保留
    closeTable()
  }

  // 文件以概念结尾时，再检查一次末尾概念的步骤数
  if (current && current.steps.length < 1) {
    pushIssue(current.heading, '封装至少需要一个步骤')
  }

  // 同一文件内重复标题
  const seen = new Map<string, number>()
  for (const concept of concepts) {
    const key = concept.heading
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count > 1) pushIssue(key, `封装标题「${key}」在文件中重复`)
  }

  return { concepts, issues, lines, eol }
}

/**
 * 由结构化封装生成 .cpt 文本。
 *
 * 注释与原始排版不保留；表格写出表头 + 数据行（不写 |---| 分隔行，与 Gauge 示例一致）。
 */
export function serializeConcepts(concepts: Concept[], eol = '\n'): string {
  const blocks: string[] = []
  for (const concept of concepts) {
    const lines: string[] = [`# ${concept.heading.trim()}`]
    for (const step of concept.steps) {
      lines.push(`* ${step.text.trim()}`)
      if (step.table) {
        lines.push(formatTableRow(step.table.headers))
        for (const row of step.table.rows) lines.push(formatTableRow(row))
      }
    }
    blocks.push(lines.join(eol))
  }
  return blocks.join(eol + eol) + (blocks.length ? eol : '')
}

function formatTableRow(cells: string[]): string {
  return `|${cells.map((cell) => cell.trim()).join('|')}|`
}

/**
 * 校验一组封装是否可以落盘：至少一个封装，每个封装至少一步，标题不重复。
 * 解析期的括号 / 引号问题已在 parseConceptIssues 里覆盖，这里只查「生成侧」约束。
 */
export function validateConcepts(concepts: Concept[]): ConceptIssue[] {
  const issues: ConceptIssue[] = []
  if (concepts.length === 0) {
    issues.push({ conceptHeading: '', message: '文件至少需要一个封装' })
  }
  const seen = new Set<string>()
  for (const concept of concepts) {
    const heading = concept.heading.trim()
    if (heading === '') {
      issues.push({ conceptHeading: '', message: '封装标题不能为空' })
      continue
    }
    if (seen.has(heading)) {
      issues.push({ conceptHeading: heading, message: `封装标题「${heading}」重复` })
    }
    seen.add(heading)
    if (concept.steps.length < 1) {
      issues.push({ conceptHeading: heading, message: '封装至少需要一个步骤' })
    }
    for (const step of concept.steps) {
      for (const message of stepIssues(step.text)) {
        issues.push({ conceptHeading: heading, message })
      }
      if (step.table) {
        const width = step.table.headers.length
        if (width === 0) {
          issues.push({ conceptHeading: heading, message: '表格至少要有一列表头' })
        }
        step.table.rows.forEach((row, index) => {
          if (row.length !== width) {
            issues.push({
              conceptHeading: heading,
              message: `表格第 ${index + 1} 行有 ${row.length} 列，与表头 ${width} 列不一致`,
            })
          }
        })
      }
    }
    for (const message of headingIssues(concept.heading)) {
      issues.push({ conceptHeading: heading, message })
    }
  }
  return issues
}

/** 由结构化封装生成合法的空白封装草稿 */
export function emptyConcept(heading = '新封装 <参数>'): Concept {
  return {
    heading,
    params: extractParams(heading),
    steps: [{ text: '第一步', table: null }],
  }
}

/** 标题改动后同步 params 派生字段 */
export function withHeading(concept: Concept, heading: string): Concept {
  return { ...concept, heading, params: extractParams(heading) }
}
