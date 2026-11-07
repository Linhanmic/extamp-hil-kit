import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  parseOutputText,
  parseSlotMappingFileText,
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
