import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RequirementsColumnMapping } from '../../src/models/common'
import {
  columnIndexToLetter,
  columnRefToIndex,
  parseRequirements,
  probeSheet,
  variantKey,
} from '../requirements-parse'
import { readSheetTable } from '../requirements-sheet'

// vitest 的 root 是仓库根目录，示例表直接按相对路径取
const SAMPLE_FILE = resolve('testdatas/需求分析表.xlsx')
const SAMPLE_SHEET = '6、软件需求分析表'

/** A=需求ID, B=需求名称, C=需求详情, D 起为车型/平台列 */
const MAPPING: RequirementsColumnMapping = {
  headerRow: 1,
  idCol: 'A',
  nameCol: 'B',
  detailCol: 'C',
  vehicleStartCol: 'D',
}

function table(rows: (string | null)[][]) {
  return { sheetName: '需求', rows }
}

describe('列号换算', () => {
  it('列字母与列号互转', () => {
    expect(columnRefToIndex('A')).toBe(1)
    expect(columnRefToIndex('ae')).toBe(31)
    expect(columnRefToIndex(7)).toBe(7)
    expect(columnIndexToLetter(1)).toBe('A')
    expect(columnIndexToLetter(31)).toBe('AE')
    expect(() => columnRefToIndex('A1')).toThrow(/列号无效/)
  })
})

describe('变体内容键', () => {
  it('抹掉空白、标点与控制字符后视为同一个变体', () => {
    const key = variantKey('变体1')
    expect(variantKey('变体 1。')).toBe(key)
    expect(variantKey('变体1\n')).toBe(key)
    expect(variantKey('变体１')).toBe(key) // 全角数字经 NFKC 归一
    expect(variantKey('变体2')).not.toBe(key)
  })
})

describe('parseRequirements', () => {
  it('需求ID与名称导入时去掉所有空白字符', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'HFAF'],
        [' REQ\n_1 ', ' 功放\n 握手 ', '详情', '●'],
        ['REQ_1', '', '', '●'],
      ]),
      MAPPING,
    )

    expect(result.requirements).toHaveLength(1)
    expect(result.requirements[0]).toMatchObject({ id: 'REQ_1', name: '功放握手' })
    expect(result.stats.mergedRows).toBe(1)
  })

  it('按 ●、●变体、—、空格解析需求行，平台列整列忽略', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'MA16D平台', 'HFAF/EFSS', 'QDWS'],
        ['REQ_1', '功放握手', '前提条件…', '●', '●变体1', '●变体2'],
        ['REQ_2', '音量控制', '阈值…', '—', '不同车型的差异描述', '—'],
      ]),
      MAPPING,
    )

    // 平台列不进车型清单；一个表头写多款车型会拆开
    expect(result.vehicles).toEqual(['HFAF', 'EFSS', 'QDWS'])
    expect(result.requirements).toHaveLength(2)

    const first = result.requirements[0]!
    expect(first).toMatchObject({ id: 'REQ_1', name: '功放握手', detail: '前提条件…' })
    expect(first.variants.map((variant) => variant.key)).toEqual(['变体1', '变体2'])
    // 一个单元格覆盖该表头里的全部车型
    expect(first.variants[0]).toMatchObject({ content: ['变体1'], vehicles: ['HFAF', 'EFSS'] })
    expect(first.variants[1]).toMatchObject({ content: ['变体2'], vehicles: ['QDWS'] })

    const second = result.requirements[1]!
    expect(second.variants.map((variant) => variant.key)).toEqual(['不同车型的差异描述'])
    expect(second.variants[0]!.vehicles).toEqual(['HFAF', 'EFSS'])

    // 平台列里的 ● / — 既不计适用也不计不适用
    expect(result.stats).toMatchObject({
      dataRows: 2,
      requirementCount: 2,
      variantCount: 3,
      vehicleCount: 3,
      applicableCells: 3,
      notApplicableCells: 1,
      textCells: 1,
    })
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatchObject({ row: 3 })
  })

  it('表头含「平台」的列整列忽略，数据再满也不影响结果', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'MA20D平台', 'HCHE'],
        ['REQ_1', '音源控制', '…', '●变体99', '●变体1'],
      ]),
      MAPPING,
    )

    expect(result.vehicles).toEqual(['HCHE'])
    expect(result.requirements[0]!.variants.map((variant) => variant.key)).toEqual(['变体1'])
  })

  it('相同变体描述跨车型合并成一个变体', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'HFAF', 'EFSS', 'HCHE'],
        ['REQ_1', '音源控制', '…', '●变体1', '●变体 1。', '●变体2'],
      ]),
      MAPPING,
    )

    const variants = result.requirements[0]!.variants
    expect(variants).toHaveLength(2)
    expect(variants[0]).toMatchObject({ key: '变体1', vehicles: ['HFAF', 'EFSS'] })
    // 原始描述全保留，便于回溯表里到底怎么写的
    expect(variants[0]!.content).toEqual(['变体1', '变体 1。'])
  })

  it('车型名归一化：去空白、下划线转连字符，一个表头多车型按 / 、 ; 拆分', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'FASLF 带华为智驾', 'SFHAZ_18CH/SFHAZ_20CH', 'A、B;C'],
        ['REQ_1', '音源控制', '…', '●变体1', '●变体2', '●变体2'],
      ]),
      MAPPING,
    )

    expect(result.vehicles).toEqual(['FASLF带华为智驾', 'SFHAZ-18CH', 'SFHAZ-20CH', 'A', 'B', 'C'])
    expect(result.requirements[0]!.variants[0]!.vehicles).toEqual(['FASLF带华为智驾'])
    expect(result.requirements[0]!.variants[1]!.vehicles).toEqual([
      'SFHAZ-18CH',
      'SFHAZ-20CH',
      'A',
      'B',
      'C',
    ])
  })

  it('空表头单列跳过、连续 2 个空表头停止向右扫描', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'HFAF', null, null, 'LOST'],
        ['REQ_1', '音源控制', '…', '●变体1', '●变体2', '●变体3', '●变体4'],
      ]),
      MAPPING,
    )

    // 第 5 列单个空表头被跳过，第 6、7 列连续两个空表头后停止，LOST 列不解析
    expect(result.vehicles).toEqual(['HFAF'])
    expect(result.requirements[0]!.variants.map((variant) => variant.key)).toEqual(['变体1'])
  })

  it('需求ID重复的行合并进同一条需求', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'HFAF', 'EFSS'],
        ['REQ_1', '功放握手', '…', '●变体1', ''],
        ['REQ_1', '', '', '', '●变体2'],
      ]),
      MAPPING,
    )

    expect(result.requirements).toHaveLength(1)
    expect(result.requirements[0]!.variants.map((variant) => variant.key)).toEqual([
      '变体1',
      '变体2',
    ])
    expect(result.stats).toMatchObject({
      dataRows: 2,
      requirementCount: 1,
      mergedRows: 1,
      variantCount: 2,
    })
  })

  it('缺需求ID的行跳过并告警，整行空白的只计数', () => {
    const result = parseRequirements(
      table([
        ['需求ID', '需求名称', '需求详情', 'HFAF'],
        ['REQ_1', '有效需求', '…', '●'],
        ['', '没写ID的需求', '…', '●'],
        [null, null, null, null],
      ]),
      MAPPING,
    )

    expect(result.requirements).toHaveLength(1)
    expect(result.stats).toMatchObject({ dataRows: 3, skippedRows: 1, blankRows: 1 })
    expect(result.warnings[0]).toMatchObject({ row: 3 })
  })

  it('车型起始列必须在需求详情列之后', () => {
    expect(() =>
      parseRequirements(table([['需求ID', '需求名称', '需求详情', 'HFAF']]), {
        ...MAPPING,
        vehicleStartCol: 'B',
      }),
    ).toThrow(/车型起始列/)
  })
})

describe('probeSheet', () => {
  it('从真实需求分析表识别表头行与列配置', () => {
    const outcome = probeSheet(readSheetTable(SAMPLE_FILE, SAMPLE_SHEET))
    expect(outcome.error).toBeUndefined()

    const probe = outcome.probe!
    expect(probe.headerRow).toBe(2)
    expect(probe.mapping).toMatchObject({
      headerRow: 2,
      idCol: 'A',
      nameCol: 'B',
      detailCol: 'E',
      vehicleStartCol: 'G',
    })
    // 功能安全列夹在详情与车型列之间、只写 QM，不应被当成车型列的起点
    const safetyColumn = probe.columns.find((column) => column.header === '功能安全')
    expect(safetyColumn).toMatchObject({
      letter: 'F',
      isPlatform: false,
      applicableCells: 0,
      notApplicableCells: 0,
      textCells: 4,
    })
    // 平台列单独标记出来，解析时会整列忽略
    expect(probe.columns.find((column) => column.header === 'MA16D平台')).toMatchObject({
      letter: 'G',
      isPlatform: true,
    })
  })

  it('没有需求ID列时给出可读错误', () => {
    const outcome = probeSheet(
      table([
        ['名称', '详情'],
        ['甲', '乙'],
      ]),
    )
    expect(outcome.error).toMatch(/需求ID/)
  })
})

describe('真实需求分析表端到端解析', () => {
  const outcome = probeSheet(readSheetTable(SAMPLE_FILE, SAMPLE_SHEET))
  const result = parseRequirements(
    readSheetTable(SAMPLE_FILE, SAMPLE_SHEET),
    outcome.probe!.mapping,
  )

  it('解析出 4 条需求与 23 个车型名（不含平台列）', () => {
    expect(result.requirements.map((item) => item.id)).toEqual([
      'SwRS_AMP_Handeshake_001',
      'SwRS_AMP_FASDF_001',
      'SwRS_AMP_HGHFV_001',
      'SwRS_AMP_FSDF_001',
    ])
    expect(result.stats).toMatchObject({
      dataRows: 4,
      requirementCount: 4,
      variantCount: 68,
      vehicleCount: 23,
      applicableCells: 84,
      notApplicableCells: 4,
      skippedRows: 0,
      mergedRows: 0,
    })
    expect(result.vehicles.slice(0, 4)).toEqual(['HFAF', 'EFSS', 'QDWS', 'FASLF带华为智驾'])
    expect(result.vehicles).not.toContain('MA16D平台')
    expect(result.vehicles).not.toContain('MA20D平台')
    // 表头里的多车型写法拆开后各自成条目
    expect(result.vehicles).toContain('SFHAZ-18CH')
    expect(result.vehicles).toContain('SFHAZ-20CH')
  })

  it('第一条需求的变体按内容键归并', () => {
    const first = result.requirements[0]!
    expect(first.variants.map((variant) => variant.key.slice(0, 12))).toEqual([
      '变体1',
      '变体2',
      '机器本身的硬件和驱动支持',
      '变体4',
      '变体5',
      '变体6',
      '变体7',
      '变体8',
      '变体9',
      '变体10',
      '变体11',
      '变体12',
      '变体13',
      '变体14',
      '变体15',
      '变体16',
      '变体17',
    ])

    expect(first.variants[0]!.vehicles).toEqual(['HFAF', 'EFSS'])
    expect(first.variants[1]!.vehicles).toEqual(['FASLF带华为智驾', 'HCHE', 'HCHE-01'])
    // L 与 P 两个单元格写的是同一段文本，归并成一个变体；SFHAZ 表头里的两款车都算进来
    const longText = first.variants[2]!
    expect(longText.vehicles).toEqual(['SFHAZ-18CH', 'SFHAZ-20CH', 'HCHE-02'])
    expect(longText.content).toHaveLength(1)
    expect(first.variants.at(-1)).toMatchObject({ key: '变体17', vehicles: ['HCHE-16'] })
  })

  it('平台列上的标记不产生变体，也不产生告警', () => {
    expect(result.warnings).toHaveLength(0)
  })
})
