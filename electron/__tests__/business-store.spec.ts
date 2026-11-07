import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseOutputText,
  parseSlotMappingText,
  parseSnapshotText,
  parseVolumeTableText,
  readOutput,
  readSlotMapping,
  readSnapshotDir,
  readVolumeTable,
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
  it('按 # 分场景，解析适用车型、步骤与 | 分隔的出声位置', () => {
    const text = [
      '# 检查智能语音关闭时出声位置是否正确',
      '* step1',
      '* 所有扬声器不出声',
      '',
      '# 检查智能语音全车播放时出声位置是否正确',
      '适用车型:SC6H,YU2',
      '* step1',
      '* 左前低音|左前高音|右前低音|中置',
    ].join('\n')

    expect(parseOutputText(text)).toEqual([
      { title: '检查智能语音关闭时出声位置是否正确', vehicles: [], steps: ['step1', '所有扬声器不出声'], speakers: [] },
      {
        title: '检查智能语音全车播放时出声位置是否正确',
        vehicles: ['SC6H', 'YU2'],
        steps: ['step1'],
        speakers: ['左前低音', '左前高音', '右前低音', '中置'],
      },
    ])
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

describe('parseSlotMappingText', () => {
  it('按 车型=路径 解析，跳过空行与注释', () => {
    const text = ['# 注释', 'SC6H=/a/1.txt', 'FE=.\\config\\2.txt', ''].join('\n')

    expect(parseSlotMappingText(text)).toEqual([
      { vehicle: 'SC6H', path: '/a/1.txt' },
      { vehicle: 'FE', path: '.\\config\\2.txt' },
    ])
  })
})

describe('parseSnapshotText', () => {
  it('解析「通道N对应名称」，拿不到通道号时按行序兜底', () => {
    const text = ['通道1对应左前低音', '通道2:左前高音', '没有通道前缀'].join('\n')

    expect(parseSnapshotText(text)).toEqual([
      { channel: '通道1', speaker: '左前低音' },
      { channel: '通道2', speaker: '左前高音' },
      { channel: '通道3', speaker: '没有通道前缀' },
    ])
  })
})

describe('读取器', () => {
  it('路径没配置时返回 unconfigured', () => {
    const project = temporaryProject()

    expect(readOutput(project, '')).toEqual({ unconfigured: true })
    expect(readVolumeTable(project, '')).toEqual({ unconfigured: true })
    expect(readSlotMapping(project, '')).toEqual({ unconfigured: true })
    expect(readSnapshotDir(project, '')).toEqual({ unconfigured: true })
  })

  it('文件 / 目录不存在时按空数据处理，不报错', () => {
    const project = temporaryProject()

    expect(readOutput(project, 'config/出声位置/缺失.txt')).toEqual({
      document: { scenarios: [] },
    })
    expect(readVolumeTable(project, 'config/音量表/缺失.csv')).toEqual({
      document: { levels: [], rows: [] },
    })
    expect(readSnapshotDir(project, 'config/不存在目录')).toEqual({ document: { files: [] } })
  })

  it('SLOT 映射会解析相对项目根的 slot 文件并读出内容', () => {
    const project = temporaryProject()
    mkdirSync(join(project, 'config', 'SLOT映射'), { recursive: true })
    writeFileSync(
      join(project, 'config', 'SLOT映射', 'mapping.ini'),
      ['SC6H=.\\config\\SLOT映射\\slot_1.txt', 'YU2=.\\config\\SLOT映射\\slot_2.txt'].join('\n'),
      'utf8',
    )
    writeFileSync(join(project, 'config', 'SLOT映射', 'slot_1.txt'), 'slot 1\nslot 2', 'utf8')

    const outcome = readSlotMapping(project, 'config/SLOT映射/mapping.ini')

    expect(outcome.document?.entries).toHaveLength(2)
    expect(outcome.document?.entries[0]).toMatchObject({
      vehicle: 'SC6H',
      filePath: join(project, 'config', 'SLOT映射', 'slot_1.txt'),
      lines: ['slot 1', 'slot 2'],
    })
    // slot_2.txt 没写，标记 missing
    expect(outcome.document?.entries[1]).toMatchObject({ vehicle: 'YU2', missing: true })
  })
})
