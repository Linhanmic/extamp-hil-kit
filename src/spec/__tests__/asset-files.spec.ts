import { describe, expect, it } from 'vitest'
import { serializeOutputScenarios } from '../output-file'
import { serializeSlotMappingPlan } from '../slot-mapping-file'
import { serializeSnapshotSections, snapshotSectionName } from '../snapshot-file'
import type { OutputScenario } from '@/models/output'
import type { SnapshotFile } from '@/models/snapshot'

function outputScenario(overrides: Partial<OutputScenario> = {}): OutputScenario {
  return {
    title: '检查媒体音出声位置',
    allVehicles: true,
    vehicles: [],
    steps: ['speak="左前高音|中置"'],
    speakKeywords: ['左前高音', '中置'],
    noSpeakKeywords: [],
    ...overrides,
  }
}

describe('serializeOutputScenarios', () => {
  it('标题、适用车型与步骤按格式写出，场景之间空一行', () => {
    const text = serializeOutputScenarios([
      outputScenario(),
      outputScenario({
        title: '全车播放',
        allVehicles: false,
        vehicles: ['SC6H', 'YU2'],
        steps: ['speak="左前高音"', 'no_speak="重低音"'],
      }),
    ])

    expect(text).toBe(
      [
        '# 检查媒体音出声位置',
        '* speak="左前高音|中置"',
        '',
        '# 全车播放',
        '适用车型:SC6H/YU2',
        '* speak="左前高音"',
        '* no_speak="重低音"',
        '',
      ].join('\n'),
    )
  })

  it('没有场景时写出空文本', () => {
    expect(serializeOutputScenarios([])).toBe('')
  })
})

describe('serializeSlotMappingPlan', () => {
  it('首行适用车型，每个场景一个 # 标题与若干 * 步骤', () => {
    const text = serializeSlotMappingPlan(['SC6H'], [
      { title: '音源盒打开媒体音SLOT', steps: ['音源盒打开SLOT1', '音源盒打开SLOT2'] },
      { title: '音源盒打开电话音SLOT', steps: ['音源盒打开SLOT13'] },
    ])

    expect(text).toBe(
      [
        '适用车型:SC6H',
        '',
        '# 音源盒打开媒体音SLOT',
        '* 音源盒打开SLOT1',
        '* 音源盒打开SLOT2',
        '',
        '# 音源盒打开电话音SLOT',
        '* 音源盒打开SLOT13',
        '',
      ].join('\n'),
    )
  })

  it('不限车型时不写适用车型行', () => {
    const text = serializeSlotMappingPlan([], [{ title: '默认场景', steps: ['SLOT1'] }])
    expect(text).toBe(['# 默认场景', '* SLOT1', ''].join('\n'))
  })
})

describe('serializeSnapshotSections', () => {
  function file(name: string, speakers: string[]): SnapshotFile {
    return {
      name,
      vehicles: name.split('/').filter(Boolean),
      channels: speakers.map((speaker, index) => ({
        channel: `通道${index + 1}`,
        speaker,
      })),
    }
  }

  it('分节按 [车型] + 扬声器行写出，分节之间空一行', () => {
    const text = serializeSnapshotSections([
      file('SC6H', ['左前低音']),
      file('SC6H/YU2', ['中置', '重低音']),
    ])
    expect(text).toBe(['[SC6H]', '左前低音', '', '[SC6H/YU2]', '中置', '重低音', ''].join('\n'))
  })

  it('分节名优先用原始名称，没有名称时按车型拼接', () => {
    expect(snapshotSectionName({ name: 'SFHAZ-18CH', vehicles: ['SFHAZ_18CH'] })).toBe(
      'SFHAZ-18CH',
    )
    expect(snapshotSectionName({ name: '', vehicles: ['SC6H', 'YU2'] })).toBe('SC6H/YU2')
  })
})
