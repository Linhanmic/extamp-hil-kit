/**
 * 「适用条件」表达式的解析与求值。
 *
 * 适用条件是一段引用配置参数的布尔表达式，例如：
 *
 *   媒体音源默认值-0x1媒体音立体声 & 示例参数-示例配置值1
 *   (媒体音源默认值-0x0无音源 | 示例参数-示例配置值1) & !功放型号-AMP-A
 *
 * 每个「配置项-配置值」通过 resolver 解析成它适用的车型集合，运算符的集合语义为：
 *   & 与（交集）、| 或（并集）、! / ~ 非（相对全量车型取补集）、() 改变优先级。
 * 条件为空表示「未编写适用条件」，等价于全量车型；关键字「预留」「不适用」等价于空集合。
 *
 * 解析与求值都是纯函数，不接触文件系统与 Vue，便于单测。
 */

/** 把「配置项-配置值」解析成车型集合 */
export interface ResolvedRef {
  vehicles: string[]
  /** 是否在配置参数里找到了对应项；false 表示引用了不存在的配置值 */
  known: boolean
}

/** 配置引用解析器：给定引用文本，返回它对应的车型集合 */
export type VehicleResolver = (ref: string) => ResolvedRef

/** 条件里表示「没有车型适用」的关键字 */
const RESERVED_KEYWORDS = new Set(['预留', '不适用'])

interface Token {
  kind: 'ref' | 'op'
  value: string
}

const OPERATORS = new Set(['&', '|', '!', '~', '(', ')'])

/** 把表达式切成操作符与「配置项-配置值」引用两类 token，空白只是分隔符 */
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < expr.length) {
    const ch = expr[i] as string
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (OPERATORS.has(ch)) {
      // 兼容 && 与 ||
      if ((ch === '&' && expr[i + 1] === '&') || (ch === '|' && expr[i + 1] === '|')) {
        tokens.push({ kind: 'op', value: ch })
        i += 2
      } else {
        tokens.push({ kind: 'op', value: ch })
        i++
      }
      continue
    }
    let j = i
    while (j < expr.length && !/\s/.test(expr[j] as string) && !OPERATORS.has(expr[j] as string)) {
      j++
    }
    tokens.push({ kind: 'ref', value: expr.slice(i, j) })
    i = j
  }
  return tokens
}

type Node =
  | { kind: 'ref'; value: string }
  | { kind: 'not'; operand: Node }
  | { kind: 'and'; left: Node; right: Node }
  | { kind: 'or'; left: Node; right: Node }

/** 递归下降解析，优先级从低到高：| → & → ! → 括号/引用 */
export function parseCondition(expr: string): Node {
  const tokens = tokenize(expr)
  let pos = 0

  const peek = (): Token | undefined => tokens[pos]
  const next = (): Token | undefined => tokens[pos++]

  function parseOr(): Node {
    let left = parseAnd()
    while (peek()?.kind === 'op' && peek()?.value === '|') {
      next()
      left = { kind: 'or', left, right: parseAnd() }
    }
    return left
  }

  function parseAnd(): Node {
    let left = parseNot()
    while (peek()?.kind === 'op' && peek()?.value === '&') {
      next()
      left = { kind: 'and', left, right: parseNot() }
    }
    return left
  }

  function parseNot(): Node {
    const token = peek()
    if (token?.kind === 'op' && (token.value === '!' || token.value === '~')) {
      next()
      return { kind: 'not', operand: parseNot() }
    }
    return parsePrimary()
  }

  function parsePrimary(): Node {
    const token = next()
    if (!token) throw new Error('适用条件不完整')
    if (token.kind === 'op' && token.value === '(') {
      const node = parseOr()
      const close = next()
      if (!(close?.kind === 'op' && close.value === ')')) {
        throw new Error('适用条件缺少右括号')
      }
      return node
    }
    if (token.kind === 'ref') return { kind: 'ref', value: token.value }
    throw new Error(`无法解析适用条件中的「${token.value}」`)
  }

  const node = parseOr()
  if (pos < tokens.length) throw new Error('适用条件存在多余内容')
  return node
}

function evalNode(
  node: Node,
  resolver: VehicleResolver,
  universe: Set<string>,
  warnings: string[],
): Set<string> {
  switch (node.kind) {
    case 'ref': {
      if (RESERVED_KEYWORDS.has(node.value)) return new Set()
      const { vehicles, known } = resolver(node.value)
      if (!known) warnings.push(node.value)
      return new Set(vehicles)
    }
    case 'not': {
      const inner = evalNode(node.operand, resolver, universe, warnings)
      const result = new Set(universe)
      for (const vehicle of inner) result.delete(vehicle)
      return result
    }
    case 'and': {
      const left = evalNode(node.left, resolver, universe, warnings)
      const right = evalNode(node.right, resolver, universe, warnings)
      const result = new Set<string>()
      for (const vehicle of left) if (right.has(vehicle)) result.add(vehicle)
      return result
    }
    case 'or': {
      const left = evalNode(node.left, resolver, universe, warnings)
      const right = evalNode(node.right, resolver, universe, warnings)
      return new Set([...left, ...right])
    }
  }
}

/**
 * 求值一段适用条件，返回按 universe 顺序排列的车型列表。
 * 表达式为空（未编写）时返回全量车型；引用了不存在的配置值会记入 warnings。
 */
export function evaluateCondition(
  expr: string | null | undefined,
  resolver: VehicleResolver,
  universe: string[],
  warnings: string[] = [],
): string[] {
  const text = expr?.trim() ?? ''
  if (!text) return [...universe]

  const node = parseCondition(text)
  const result = evalNode(node, resolver, new Set(universe), warnings)
  return universe.filter((vehicle) => result.has(vehicle))
}
