import { describe, expect, it } from 'vitest'
import { buildOutputConcepts, buildSlotConcepts } from '../vehicle-assets'
import type { OutputScenario } from '@/models/output'
import type { SlotMappingPlan } from '@/models/slot-map'

describe('buildOutputConcepts', () => {
  const scenarios: OutputScenario[] = [
    {
      title: '媒体音场景',
      allVehicles: true,
      vehicles: [],
      steps: ['speak="左前|中置"'],
      speakKeywords: ['左前', '中置'],
      noSpeakKeywords: [],
    },
    {
      title: 'SC6H专属',
      allVehicles: false,
      vehicles: ['SC6H'],
      steps: ['step'],
      speakKeywords: [],
      noSpeakKeywords: [],
    },
    {
      title: '其他车型',
      allVehicles: false,
      vehicles: ['YU2'],
      steps: [],
      speakKeywords: [],
      noSpeakKeywords: [],
    },
  ]

  it('包含全部车型场景与匹配车型，跳过其他车型和空步骤', () => {
    const concepts = buildOutputConcepts(scenarios, 'SC6H')
    expect(concepts.map((concept) => concept.heading)).toEqual(['媒体音场景', 'SC6H专属'])
    expect(concepts[0]?.steps[0]?.text).toBe('speak="左前|中置"')
  })
})

describe('buildSlotConcepts', () => {
  const plans: SlotMappingPlan[] = [
    {
      name: 'SLOT映射（带杜比模式）.txt',
      filePath: '/x.txt',
      vehicles: ['SC6H'],
      scenarios: [
        {
          title: '媒体音',
          steps: ['音源盒打开SLOT1'],
          slots: [1],
          hasNonSlotSteps: false,
        },
        {
          title: '杜比音',
          steps: [],
          slots: [1, 2],
          hasNonSlotSteps: false,
        },
      ],
    },
    {
      name: '其他.txt',
      filePath: '/y.txt',
      vehicles: ['YU2'],
      scenarios: [
        { title: '媒体音', steps: ['音源盒打开SLOT3'], slots: [3], hasNonSlotSteps: false },
      ],
    },
  ]

  it('按车型汇总映射方案，标题不带 txt 后缀且跳过空步骤', () => {
    const concepts = buildSlotConcepts(plans, 'SC6H')
    expect(concepts.map((concept) => concept.heading)).toEqual(['SLOT映射（带杜比模式） · 媒体音'])
    expect(buildSlotConcepts(plans, '不存在车型')).toEqual([])
  })
})
