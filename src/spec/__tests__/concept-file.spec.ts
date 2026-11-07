import { describe, expect, it } from 'vitest'
import {
  emptyConcept,
  extractParams,
  isConceptHeading,
  isConceptStepLine,
  isTableRow,
  parseConceptFile,
  serializeConcepts,
  validateConcepts,
  withHeading,
  type Concept,
} from '../concept-file'

describe('行分类', () => {
  it('封装标题：# 开头且第二字符不是 #', () => {
    expect(isConceptHeading('# 创建用户')).toBe(true)
    expect(isConceptHeading('#创建用户')).toBe(true)
    expect(isConceptHeading('## 场景')).toBe(false)
    expect(isConceptHeading('###')).toBe(false)
  })

  it('步骤行：* 开头，** 不算', () => {
    expect(isConceptStepLine('* assign id <id>')).toBe(true)
    expect(isConceptStepLine('*  step')).toBe(true)
    expect(isConceptStepLine('** bold **')).toBe(false)
    expect(isConceptStepLine('plain')).toBe(false)
  })

  it('表格行：去空白后 | 开头并 | 结尾', () => {
    expect(isTableRow('|a|b|')).toBe(true)
    expect(isTableRow('  |a|  ')).toBe(true)
    expect(isTableRow('|a|b')).toBe(false)
    expect(isTableRow('a|b')).toBe(false)
  })
})

describe('extractParams', () => {
  it('抽出 <参数名> 并去重', () => {
    expect(extractParams('创建用户 <用户ID> <用户名> 和 <用户ID>')).toEqual(['用户ID', '用户名'])
    expect(extractParams('没有参数')).toEqual([])
    expect(extractParams('空参数 <> <  >')).toEqual([])
  })
})

describe('parseConceptFile', () => {
  it('解析标题、参数、步骤与内联表格', () => {
    const text = [
      'COMMENT',
      '# my concept <foo>',
      '* first step with <foo> and inline table',
      '  |id|name  |',
      '  |1 |gauge |',
      '  |2 |mingle|',
      '   comment',
      '# assign id <userid> and name <username>',
      '* add id <userid>',
      '* add name <username>',
    ].join('\n')

    const parsed = parseConceptFile(text)

    expect(parsed.concepts).toHaveLength(2)
    expect(parsed.issues).toEqual([])

    const first = parsed.concepts[0]!
    expect(first.heading).toBe('my concept <foo>')
    expect(first.params).toEqual(['foo'])
    expect(first.steps).toHaveLength(1)
    expect(first.steps[0]!.text).toBe('first step with <foo> and inline table')
    expect(first.steps[0]!.table).toEqual({
      headers: ['id', 'name'],
      rows: [
        ['1', 'gauge'],
        ['2', 'mingle'],
      ],
    })

    const second = parsed.concepts[1]!
    expect(second.params).toEqual(['userid', 'username'])
    expect(second.steps.map((step) => step.text)).toEqual([
      'add id <userid>',
      'add name <username>',
    ])
  })

  it('表格分隔行被忽略，不进数据', () => {
    const text = ['# c', '* step', '|a|b|', '|---|---|', '|1|2|'].join('\n')
    const parsed = parseConceptFile(text)
    expect(parsed.concepts[0]!.steps[0]!.table).toEqual({
      headers: ['a', 'b'],
      rows: [['1', '2']],
    })
    expect(parsed.issues).toEqual([])
  })

  it('空概念（无步骤）报错', () => {
    const parsed = parseConceptFile('# only heading\n# another <x>\n* ok')
    expect(parsed.issues).toEqual([
      { conceptHeading: 'only heading', message: '封装至少需要一个步骤' },
    ])
    expect(parsed.concepts).toHaveLength(2)
  })

  it('步骤不在标题下、场景标题 都会报错', () => {
    const parsed = parseConceptFile(['* orphan', '## scenario', '* step2'].join('\n'))
    expect(parsed.issues.map((issue) => issue.message)).toEqual([
      '步骤「* orphan」不在任何封装标题下',
      '封装文件不允许场景标题（##），请只用 # 封装标题',
      '步骤「* step2」不在任何封装标题下',
    ])
  })

  it('标题不允许静态 / 特殊参数', () => {
    const parsed = parseConceptFile('# create user "static" :special\n* step')
    const messages = parsed.issues.map((issue) => issue.message)
    expect(messages).toContain('封装标题只能有动态参数 <参数名>，不能有 "静态值"')
    expect(messages).toContain('封装标题只能有动态参数 <参数名>，不能有 :特殊参数')
  })

  it('同一文件标题重复报错', () => {
    const parsed = parseConceptFile('# same\n* a\n\n# same\n* b')
    expect(parsed.issues).toEqual([
      { conceptHeading: 'same', message: '封装标题「same」在文件中重复' },
    ])
  })

  it('步骤参数括号 / 引号未配对报错', () => {
    const parsed = parseConceptFile('# c <id>\n* add <id\n* say "hi')
    const messages = parsed.issues.map((issue) => issue.message)
    expect(messages).toContain('步骤里的参数括号未配对（应写成 <参数名>）')
    expect(messages).toContain('步骤里的静态值引号未配对')
  })
})

describe('serializeConcepts', () => {
  it('生成标准 .cpt 文本', () => {
    const concepts: Concept[] = [
      {
        heading: '创建用户 <用户ID>',
        params: ['用户ID'],
        steps: [
          { text: '分配编号 <用户ID>', table: null },
          {
            text: '写入资料',
            table: {
              headers: ['项', '值'],
              rows: [['名字', '甲']],
            },
          },
        ],
      },
      {
        heading: '登录 <用户ID>',
        params: ['用户ID'],
        steps: [{ text: '输入 <用户ID>', table: null }],
      },
    ]

    expect(serializeConcepts(concepts)).toBe(
      [
        '# 创建用户 <用户ID>',
        '* 分配编号 <用户ID>',
        '* 写入资料',
        '|项|值|',
        '|名字|甲|',
        '',
        '# 登录 <用户ID>',
        '* 输入 <用户ID>',
        '',
      ].join('\n'),
    )
  })

  it('空列表生成空串', () => {
    expect(serializeConcepts([])).toBe('')
  })

  it('解析 → 序列化 往返稳定', () => {
    const text = [
      '# create user <user-id> <user-name>',
      '* assign id <user-id> and name <user-name>',
      '* assign phone <user-phone>',
      '',
      '# assign id <userid> and name <username>',
      '* add id <userid>',
      '* add name <username>',
      '',
    ].join('\n')

    const parsed = parseConceptFile(text)
    const round = serializeConcepts(parsed.concepts)
    expect(parseConceptFile(round).concepts).toEqual(parsed.concepts)
  })
})

describe('validateConcepts', () => {
  it('空文件、空标题、缺步骤、标题重复都会拦下', () => {
    expect(validateConcepts([])).toEqual([{ conceptHeading: '', message: '文件至少需要一个封装' }])

    const issues = validateConcepts([
      emptyConcept(''),
      { heading: 'ok', params: [], steps: [] },
      { heading: 'ok', params: [], steps: [{ text: 'step', table: null }] },
    ])
    const messages = issues.map((issue) => issue.message)
    expect(messages).toContain('封装标题不能为空')
    expect(messages).toContain('封装至少需要一个步骤')
    expect(messages).toContain('封装标题「ok」重复')
  })

  it('表格列数不一致报错', () => {
    const issues = validateConcepts([
      {
        heading: 'c',
        params: [],
        steps: [
          {
            text: 'step',
            table: { headers: ['a', 'b'], rows: [['1']] },
          },
        ],
      },
    ])
    expect(issues.map((issue) => issue.message)).toEqual([
      '表格第 1 行有 1 列，与表头 2 列不一致',
    ])
  })
})

describe('withHeading', () => {
  it('标题改动后同步参数', () => {
    const concept = withHeading(emptyConcept('旧 <a>'), '新 <b> <c>')
    expect(concept.heading).toBe('新 <b> <c>')
    expect(concept.params).toEqual(['b', 'c'])
  })
})
