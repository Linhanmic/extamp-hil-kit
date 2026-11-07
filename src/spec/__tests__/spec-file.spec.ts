import { describe, expect, it } from 'vitest'
import type { VehicleResolver } from '../condition'
import { analyzeSpec, isScenarioHeading, isSpecHeading, parseSpec, tagPrefixLength, updateSpecTags } from '../spec-file'

const UNIVERSE = ['HFAF', 'EFSS', 'HCHE', 'YU2']

function resolver(map: Record<string, string[]>): VehicleResolver {
  return (ref) => ({ vehicles: map[ref] ?? [], known: ref in map })
}

const RESOLVER = resolver({
  '媒体音源默认值-0x0无音源': ['HFAF', 'HCHE'],
  '示例参数-示例配置值1': ['HCHE', 'YU2'],
})

const SPEC_TEXT = [
  '适用条件:媒体音源默认值-0x0无音源',
  '# Specification Heading',
  '',
  'Some description.',
  '',
  '## 场景一',
  '适用条件:示例参数-示例配置值1',
  'tags: 旧标签',
  '',
  '* step one',
  '',
  '## 场景二',
  '',
  '* step two',
].join('\n')

describe('Gauge 标题规则', () => {
  it('场景标题：## 开头且第三字符不是 #', () => {
    expect(isScenarioHeading('## 场景')).toBe(true)
    expect(isScenarioHeading('##场景')).toBe(true) // 无空格也算
    expect(isScenarioHeading('##')).toBe(true)
    expect(isScenarioHeading('### 子标题')).toBe(false)
    expect(isScenarioHeading('###')).toBe(false)
    expect(isScenarioHeading('# 标题')).toBe(false)
  })

  it('规格书标题：# 开头且第二字符不是 #', () => {
    expect(isSpecHeading('# 标题')).toBe(true)
    expect(isSpecHeading('#标题')).toBe(true)
    expect(isSpecHeading('#')).toBe(true)
    expect(isSpecHeading('## 场景')).toBe(false)
    expect(isSpecHeading('###')).toBe(false)
  })

  it('标签行前缀：tags: 与 tags :（不区分大小写）', () => {
    expect(tagPrefixLength('tags: a')).toBe(5)
    expect(tagPrefixLength('tags : a')).toBe(6)
    expect(tagPrefixLength('TAGS: a')).toBe(5)
    expect(tagPrefixLength('tags:a')).toBe(5)
    expect(tagPrefixLength('tags  : a')).toBe(-1) // 双空格不是 Gauge 的标签行
    expect(tagPrefixLength('stag: a')).toBe(-1)
  })
})

describe('parseSpec', () => {
  it('抽出规格书级与场景级的适用条件、标签与行号', () => {
    const parsed = parseSpec(SPEC_TEXT)

    expect(parsed.specCondition).toBe('媒体音源默认值-0x0无音源')
    expect(parsed.scenarios).toHaveLength(2)

    const first = parsed.scenarios[0]!
    expect(first.heading).toBe('场景一')
    expect(first.condition).toBe('示例参数-示例配置值1')
    expect(first.tags).toEqual(['旧标签'])
    expect(first.headingIndex).toBe(5)
    expect(first.conditionIndex).toBe(6)
    expect(first.tagLineIndices).toEqual([7])

    const second = parsed.scenarios[1]!
    expect(second.heading).toBe('场景二')
    expect(second.condition).toBeNull()
    expect(second.tags).toEqual([])
    expect(second.tagLineIndices).toEqual([])
  })

  it('### 不另起场景；##无空格 也算场景', () => {
    const parsed = parseSpec(['# T', '## A', '### 子标题', '##B', '## C'].join('\n'))
    expect(parsed.scenarios.map((s) => s.heading)).toEqual(['A', 'B', 'C'])
  })

  it('逗号结尾的标签续行会合并进同一场景', () => {
    const parsed = parseSpec(
      ['# T', '## A', 'tags: t1, t2,', 't3', '## B', 'tags: x'].join('\n'),
    )
    expect(parsed.scenarios[0]!.tags).toEqual(['t1', 't2', 't3'])
    expect(parsed.scenarios[0]!.tagLineIndices).toEqual([2, 3])
    expect(parsed.scenarios[1]!.tags).toEqual(['x'])
    expect(parsed.scenarios[1]!.tagLineIndices).toEqual([5])
  })

  it('首个 ## 之前是规格书级标签，不计入场景', () => {
    const parsed = parseSpec(['# T', 'tags: spec-tag', '## A', 'tags: a'].join('\n'))
    expect(parsed.scenarios).toHaveLength(1)
    expect(parsed.scenarios[0]!.tags).toEqual(['a'])
  })

  it('下划线式标题：上一行文字 + --- / ===', () => {
    const parsed = parseSpec(
      ['Spec Title', '===', '一些描述', 'Scn Title', '---', 'tags: a'].join('\n'),
    )
    // "Scn Title" 紧挨 --- 且不是结构性行，被转为场景标题
    expect(parsed.scenarios.map((s) => s.heading)).toEqual(['Scn Title'])
    expect(parsed.scenarios[0]!.tags).toEqual(['a'])
  })

  it('保留检测到的行尾符', () => {
    expect(parseSpec('a\r\nb').eol).toBe('\r\n')
    expect(parseSpec('a\nb').eol).toBe('\n')
  })
})

describe('updateSpecTags', () => {
  it('替换已有 tags 行，保留用户标签，追加车型标签', () => {
    const parsed = parseSpec(SPEC_TEXT)
    const result = updateSpecTags(parsed, () => ['HFAF', 'HCHE'], UNIVERSE)

    const lines = result.text.split('\n')
    expect(lines[7]).toBe('tags: 旧标签, HFAF, HCHE')
    expect(result.changed).toBe(true)
    expect(result.changes[0]).toMatchObject({
      before: ['旧标签'],
      after: ['旧标签', 'HFAF', 'HCHE'],
    })
    expect(lines[0]).toBe('适用条件:媒体音源默认值-0x0无音源')
    expect(lines[6]).toBe('适用条件:示例参数-示例配置值1')
    expect(lines[9]).toBe('* step one')
  })

  it('没有 tags 行时在标题（或适用条件）之后补一行', () => {
    const parsed = parseSpec(SPEC_TEXT)
    const result = updateSpecTags(parsed, () => ['YU2'], UNIVERSE)
    const lines = result.text.split('\n')

    expect(lines[11]).toBe('## 场景二')
    expect(lines[12]).toBe('tags: YU2')
  })

  it('没有车型适用时标签改为不适用，清掉旧的车型标签', () => {
    const parsed = parseSpec(['# T', '## A', 'tags: 旧标签, HFAF', '## B', 'tags: 不适用'].join('\n'))
    const result = updateSpecTags(parsed, () => [], UNIVERSE)
    const lines = result.text.split('\n')

    expect(lines[2]).toBe('tags: 旧标签, 不适用')
    expect(lines[4]).toBe('tags: 不适用')
    expect(result.changes[1]).toMatchObject({ before: ['不适用'], after: ['不适用'] })
  })

  it('多行标签会合并为一行', () => {
    const parsed = parseSpec(['# T', '## A', 'tags: t1, t2,', 't3'].join('\n'))
    const result = updateSpecTags(parsed, () => ['YU2'], UNIVERSE)
    const lines = result.text.split('\n')

    expect(lines[2]).toBe('tags: t1, t2, t3, YU2')
    expect(result.text.split('\n')).toHaveLength(3) // 续行被并入
  })

  it('标签没有变化时 changed 为 false', () => {
    const parsed = parseSpec(['# T', '## A', 'tags: 不适用'].join('\n'))
    const result = updateSpecTags(parsed, () => [], UNIVERSE)
    expect(result.changed).toBe(false)
    expect(result.text).toBe(['# T', '## A', 'tags: 不适用'].join('\n'))
  })
})

describe('analyzeSpec', () => {
  it('规格书条件与场景条件取交集填入标签，没写条件的场景全量车型', () => {
    const analysis = analyzeSpec(SPEC_TEXT, RESOLVER, UNIVERSE)

    expect(analysis.vehicles[0]).toEqual(['HCHE'])
    expect(analysis.vehicles[1]).toEqual(['HFAF', 'HCHE'])

    const lines = analysis.newText.split('\n')
    expect(lines[7]).toBe('tags: 旧标签, HCHE')
    expect(lines[11]).toBe('## 场景二')
    expect(lines[12]).toBe('tags: HFAF, HCHE')
    expect(analysis.changed).toBe(true)
  })

  it('规格书级条件为不适用时，所有场景都没有车型', () => {
    const text = ['适用条件:不适用', '# T', '## A', 'tags: 旧标签'].join('\n')
    const analysis = analyzeSpec(text, RESOLVER, UNIVERSE)

    expect(analysis.vehicles[0]).toEqual([])
    expect(analysis.newText.split('\n')[3]).toBe('tags: 旧标签, 不适用')
    expect(analysis.changed).toBe(true)
  })

  it('适用条件写法有误时按没有车型处理并给出警告', () => {
    const text = ['适用条件:(A', '# T', '## A'].join('\n')
    const analysis = analyzeSpec(text, RESOLVER, UNIVERSE)

    expect(analysis.vehicles[0]).toEqual([])
    expect(analysis.warnings[0]).toMatch(/右括号/)
    expect(analysis.newText.split('\n')[3]).toBe('tags: 不适用')
  })

  it('引用不存在的配置值会记入警告', () => {
    const text = ['适用条件:不存在的-配置值', '# T', '## A'].join('\n')
    const analysis = analyzeSpec(text, RESOLVER, UNIVERSE)

    expect(analysis.warnings).toEqual(['不存在的-配置值'])
    expect(analysis.vehicles[0]).toEqual([])
  })
})
