import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseOutputText,
  appendSnapshot,
  parseSlotMappingFileText,
  parseSnapshotIniText,
  parseVolumeTableText,
  readOutput,
  readSlotMapping,
  readSnapshotFile,
  readVolumeTable,
  writeVolumeTable,
} from '../business-store'

const temporaryDirs: string[] = []

function temporaryProject() {
  const dir = mkdtempSync(join(tmpdir(), 'hil-business-'))
  temporaryDirs.push(dir)
  return dir
}

afterEach(() => {
  while (temporaryDirs.length)
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true })
})

describe('parseOutputText', () => {
  it('未写适用车型表示全部车型，旧竖线列表仍识别为出声关键字', () => {
    const text = [
      '# 检查智能语音关闭时出声位置是否正确',
      '* step1',
      '* 所有扬声器不出声',
      '',
      '# 检查智能语音全车播放时出声位置是否正确',
      '适用车型:SC6H/YU2',
      '* step1',
      '* 左前低音|左前高音|右前低音|中置',
    ].join('\n')

    expect(parseOutputText(text)).toEqual([
      {
        title: '检查智能语音关闭时出声位置是否正确',
        allVehicles: true,
        vehicles: [],
        steps: ['step1', '所有扬声器不出声'],
        speakKeywords: [],
        noSpeakKeywords: [],
      },
      {
        title: '检查智能语音全车播放时出声位置是否正确',
        allVehicles: false,
        vehicles: ['SC6H', 'YU2'],
        steps: ['step1'],
        speakKeywords: ['左前低音', '左前高音', '右前低音', '中置'],
        noSpeakKeywords: [],
      },
    ])
  })

  it('识别 speak 与 no_speak 后单双引号内容，多个关键字按竖线分隔', () => {
    const text = [
      '# 场景',
      '适用车型:SC6H/YU2',
      '* speak="左前低音|中置"',
      '* no_speak=\'右前低音|重低音\'',
      '* speak="左前高音"',
    ].join('\n')

    expect(parseOutputText(text)[0]).toMatchObject({
      allVehicles: false,
      vehicles: ['SC6H', 'YU2'],
      speakKeywords: ['左前低音', '中置', '左前高音'],
      noSpeakKeywords: ['右前低音', '重低音'],
    })
  })
})

describe('parseVolumeTableText', () => {
  it('识别表头档位并解析每一行', () => {
    const text = [
      '车型;音源;0;1;2',
      'SC6H/HT/FDLK;媒体音;-99;-78.6;-64',
      'FE/YU2;电话音;-99;;-64',
    ].join('\n')

    expect(parseVolumeTableText(text)).toEqual({
      levels: ['0', '1', '2'],
      rows: [
        { vehicle: 'SC6H/HT/FDLK', source: '媒体音', values: ['-99', '-78.6', '-64'] },
        { vehicle: 'FE/YU2', source: '电话音', values: ['-99', '', '-64'] },
      ],
    })
  })

  it('也支持逗号分隔', () => {
    const text = '车型,音源,0,1\nYU2,媒体音,-99,-78.6'

    expect(parseVolumeTableText(text).levels).toEqual(['0', '1'])
    expect(parseVolumeTableText(text).rows[0]).toMatchObject({
      vehicle: 'YU2',
      source: '媒体音',
    })
  })
})

describe('writeVolumeTable', () => {
  it('整份写回并沿用原分隔符，空 dB 保留为空单元格', () => {
    const project = temporaryProject()
    const dir = join(project, 'config', '音量表')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'test.csv'), '车型,音源,0,1\n旧车型,媒体音,-99,-78\n', 'utf8')

    const outcome = writeVolumeTable(project, 'config/音量表/test.csv', {
      levels: ['0', '1'],
      rows: [
        { vehicle: 'SC6H', source: '媒体音', values: ['-99', '-78.6'] },
        { vehicle: 'YU2', source: '电话音', values: ['-99', ''] },
      ],
    })
    expect(outcome.saved).toBeDefined()
    expect(readFileSync(join(dir, 'test.csv'), 'utf8')).toContain('YU2,电话音,-99,')

    const parsed = readVolumeTable(project, 'config/音量表/test.csv')
    expect(parsed.document?.rows).toHaveLength(2)
    expect(parsed.document?.rows[1]?.values).toEqual(['-99', ''])
  })
})

describe('parseSnapshotIniText', () => {
  it('按车型分节，扬声器按非空行从通道 1 递增', () => {
    const text = [
      '[SC6H/HTHE_HTBU/SF海外]',
      '通道1对应左前低音',
      '',
      '左前高音',
      '[YU]',
      '通道1对应中置',
    ].join('\n')

    expect(parseSnapshotIniText(text)).toEqual([
      {
        name: 'SC6H/HTHE_HTBU/SF海外',
        vehicles: ['SC6H', 'HTHE_HTBU', 'SF海外'],
        channels: [
          { channel: '通道1', speaker: '左前低音' },
          { channel: '通道2', speaker: '左前高音' },
        ],
      },
      {
        name: 'YU',
        vehicles: ['YU'],
        channels: [{ channel: '通道1', speaker: '中置' }],
      },
    ])
  })
})

describe('appendSnapshot', () => {
  it('保留原内容并追加分节，同名分节拒绝', () => {
    const project = temporaryProject()
    const dir = join(project, 'config', '扬声器快照')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'snapshot.ini'), '[SC6H]\n左前低音\n', 'utf8')

    const outcome = appendSnapshot(project, 'config/扬声器快照/snapshot.ini', 'YU2', ['中置', '重低音'])
    expect(outcome.saved?.filePath).toBe(join(dir, 'snapshot.ini'))

    const text = readFileSync(join(dir, 'snapshot.ini'), 'utf8')
    expect(text).toContain('[SC6H]')
    expect(text).toContain('[YU2]\n中置\n重低音')
    expect(appendSnapshot(project, 'config/扬声器快照/snapshot.ini', 'YU2', ['中置']).error).toMatch(/已存在/)
  })

  it('文件不存在时创建，空车型或空扬声器拒绝', () => {
    const project = temporaryProject()
    const outcome = appendSnapshot(project, 'config/扬声器快照/snapshot.ini', 'SC6H/YU2', ['左前'])
    expect(outcome.saved).toBeDefined()
    expect(appendSnapshot(project, 'config/扬声器快照/snapshot.ini', '', ['左前']).error).toMatch(/名称不正确/)
    expect(appendSnapshot(project, 'config/扬声器快照/snapshot.ini', 'SC6H', ['  ']).error).toMatch(/至少填写/)
  })
})

describe('读取器', () => {
  it('路径没配置时返回 unconfigured', () => {
    const project = temporaryProject()

    expect(readOutput(project, '')).toEqual({ unconfigured: true })
    expect(readVolumeTable(project, '')).toEqual({ unconfigured: true })
    expect(readSlotMapping(project, '')).toEqual({ unconfigured: true })
    expect(readSnapshotFile(project, '')).toEqual({ unconfigured: true })
  })

  it('文件 / 目录不存在时按空数据处理，不报错', () => {
    const project = temporaryProject()

    expect(readOutput(project, 'config/出声位置/缺失.txt')).toEqual({
      document: { scenarios: [] },
    })
    expect(readVolumeTable(project, 'config/音量表/缺失.csv')).toEqual({
      document: { levels: [], rows: [] },
    })
    expect(readSnapshotFile(project, 'config/不存在目录/snapshot.ini')).toEqual({
      document: { files: [] },
    })
  })

  it('快照只读取目录下统一的 snapshot.ini', () => {
    const project = temporaryProject()
    const dir = join(project, 'config', '扬声器快照')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'snapshot.ini'),
      ['[SC6H/YU2]', '通道1对应左前低音', '', '左前高音'].join('\n'),
      'utf8',
    )
    writeFileSync(join(dir, '旧快照.txt'), '通道1对应不应读取', 'utf8')

    const outcome = readSnapshotFile(project, 'config/扬声器快照/snapshot.ini')

    expect(outcome.document?.files).toHaveLength(1)
    expect(outcome.document?.files[0]).toMatchObject({
      name: 'SC6H/YU2',
      vehicles: ['SC6H', 'YU2'],
      channels: [
        { channel: '通道1', speaker: '左前低音' },
        { channel: '通道2', speaker: '左前高音' },
      ],
    })
  })

  it('SLOT 映射按目录读取 txt，解析车型、音源与 SLOT', () => {
    const project = temporaryProject()
    const dir = join(project, 'config', 'SLOT映射')
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'SLOT映射（带杜比模式）.txt'),
      [
        '适用车型:SC6H/YU2,SF海外',
        '# 媒体音立体声',
        '* 打开SLOT 1、SLOT 2',
        '# 杜比音',
        '* 打开SLOT 1、SLOT 2、SLOT 3、SLOT 4',
        '# 电话音',
        '* 打开SLOT 13',
      ].join('\n'),
      'utf8',
    )
    writeFileSync(
      join(dir, 'SLOT映射（不带杜比模式）.txt'),
      ['适用车型:SC6E/HKE', '# 媒体音立体声', '* 打开SLOT 1、SLOT 2', '# 杜比音', '* sleep "100ms"'].join(
        '\n',
      ),
      'utf8',
    )

    const outcome = readSlotMapping(project, 'config/SLOT映射')

    expect(outcome.document?.plans).toHaveLength(2)
    expect(outcome.document?.plans[0]).toMatchObject({
      name: 'SLOT映射（不带杜比模式）.txt',
      vehicles: ['SC6E', 'HKE'],
    })
    expect(outcome.document?.plans[0]?.scenarios[1]).toMatchObject({
      title: '杜比音',
      slots: [],
      hasNonSlotSteps: true,
    })
    expect(outcome.document?.plans[1]).toMatchObject({
      name: 'SLOT映射（带杜比模式）.txt',
      vehicles: ['SC6H', 'YU2', 'SF海外'],
    })
    expect(outcome.document?.plans[1]?.scenarios[2]).toMatchObject({
      title: '电话音',
      slots: [13],
    })
  })

  it('SLOT 映射文件文本支持多行适用车型与无 SLOT 步骤', () => {
    const parsed = parseSlotMappingFileText(
      ['适用车型:FD/HE/DK', '# 媒体音立体声', '* SLOT 1', '* SLOT 2', '# 电话音', '* sleep "100ms"'].join(
        '\n',
      ),
    )
    expect(parsed.vehicles).toEqual(['FD', 'HE', 'DK'])
    expect(parsed.scenarios.map((scenario) => scenario.slots)).toEqual([[1, 2], []])
  })
})
