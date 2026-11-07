import { describe, expect, it } from 'vitest'
import { evaluateCondition, parseCondition, tokenize, type VehicleResolver } from '../condition'

const UNIVERSE = ['HFAF', 'EFSS', 'HCHE', 'YU2']

function resolver(map: Record<string, string[]>): VehicleResolver {
  return (ref) => ({ vehicles: map[ref] ?? [], known: ref in map })
}

const RESOLVER = resolver({
  '媒体音源默认值-0x0无音源': ['HFAF', 'HCHE'],
  '媒体音源默认值-0x1媒体音立体声': ['EFSS'],
  '示例参数-示例配置值1': ['HCHE', 'YU2'],
})

describe('tokenize', () => {
  it('把配置引用与运算符分开，&& 与 || 归一为单字符', () => {
    expect(tokenize('A-1 & B-2')).toEqual([
      { kind: 'ref', value: 'A-1' },
      { kind: 'op', value: '&' },
      { kind: 'ref', value: 'B-2' },
    ])
    expect(tokenize('(A-1||B-2)&&!C-3')).toEqual([
      { kind: 'op', value: '(' },
      { kind: 'ref', value: 'A-1' },
      { kind: 'op', value: '|' },
      { kind: 'ref', value: 'B-2' },
      { kind: 'op', value: ')' },
      { kind: 'op', value: '&' },
      { kind: 'op', value: '!' },
      { kind: 'ref', value: 'C-3' },
    ])
  })

  it('配置引用里的 - 不是运算符', () => {
    expect(tokenize('功放型号-SFHAZ-18CH')).toEqual([
      { kind: 'ref', value: '功放型号-SFHAZ-18CH' },
    ])
  })
})

describe('evaluateCondition', () => {
  it('未编写条件时默认全量车型', () => {
    expect(evaluateCondition(null, RESOLVER, UNIVERSE)).toEqual(UNIVERSE)
    expect(evaluateCondition('   ', RESOLVER, UNIVERSE)).toEqual(UNIVERSE)
  })

  it('预留 / 不适用表示没有车型适用', () => {
    expect(evaluateCondition('不适用', RESOLVER, UNIVERSE)).toEqual([])
    expect(evaluateCondition('预留', RESOLVER, UNIVERSE)).toEqual([])
  })

  it('单个配置引用解析出它的适用车型，按 universe 顺序返回', () => {
    expect(evaluateCondition('示例参数-示例配置值1', RESOLVER, UNIVERSE)).toEqual(['HCHE', 'YU2'])
  })

  it('& 取交集，| 取并集，! 相对全量取补集', () => {
    // 交集：[HFAF, HCHE] ∩ [HCHE, YU2] = [HCHE]
    expect(
      evaluateCondition('媒体音源默认值-0x0无音源 & 示例参数-示例配置值1', RESOLVER, UNIVERSE),
    ).toEqual(['HCHE'])
    // 并集：[HFAF, HCHE] ∪ [EFSS] = [HFAF, EFSS, HCHE]
    expect(
      evaluateCondition('媒体音源默认值-0x0无音源 | 媒体音源默认值-0x1媒体音立体声', RESOLVER, UNIVERSE),
    ).toEqual(['HFAF', 'EFSS', 'HCHE'])
    // 补集：全量 − [HFAF, HCHE] = [EFSS, YU2]
    expect(evaluateCondition('!媒体音源默认值-0x0无音源', RESOLVER, UNIVERSE)).toEqual([
      'EFSS',
      'YU2',
    ])
    expect(evaluateCondition('~媒体音源默认值-0x0无音源', RESOLVER, UNIVERSE)).toEqual([
      'EFSS',
      'YU2',
    ])
  })

  it('括号改变优先级，默认 ! > & > |', () => {
    const map = resolver({
      A: ['HFAF', 'EFSS'],
      B: ['HFAF'],
      C: ['HCHE'],
    })
    // 默认 & 先于 |：(A ∩ B) ∪ C = [HFAF] ∪ [HCHE] = [HFAF, HCHE]
    expect(evaluateCondition('A & B | C', map, UNIVERSE)).toEqual(['HFAF', 'HCHE'])
    // 括号：A ∩ (B ∪ C) = [HFAF, EFSS] ∩ [HFAF, HCHE] = [HFAF]
    expect(evaluateCondition('A & (B | C)', map, UNIVERSE)).toEqual(['HFAF'])
    // 双重否定
    expect(evaluateCondition('!!A', map, UNIVERSE)).toEqual(['HFAF', 'EFSS'])
  })

  it('引用不存在的配置值时给空集并记入警告', () => {
    const warnings: string[] = []
    const result = evaluateCondition('不存在的-配置值', RESOLVER, UNIVERSE, warnings)
    expect(result).toEqual([])
    expect(warnings).toEqual(['不存在的-配置值'])
  })

  it('括号不闭合、表达式不完整时抛错', () => {
    expect(() => parseCondition('(A | B')).toThrow(/右括号/)
    expect(() => parseCondition('A &')).toThrow(/不完整/)
    expect(() => parseCondition('A B')).toThrow(/多余内容/)
    expect(() => parseCondition('!')).toThrow(/不完整/)
  })
})
