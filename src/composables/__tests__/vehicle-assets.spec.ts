import { describe, expect, it } from 'vitest'
import { planOutputConcepts, planSlotConcepts } from '../vehicle-assets'
import { mergeVehicleConcepts } from '@/spec/vehicle-concepts'
import type { OutputScenario } from '@/models/output'
import type { SlotMappingPlan } from '@/models/slot-map'

describe('planOutputConcepts', () => {
  const scenarios: OutputScenario[] = [
    {
      title: '媒体音源播放时检查出声位置是否正确',
      allVehicles: true,
      vehicles: [],
      steps: ['speak="左前|中置"'],
      speakKeywords: ['左前', '中置'],
      noSpeakKeywords: [],
    },
    {
      title: '媒体音源播放时检查出声位置是否正确',
      allVehicles: false,
      vehicles: ['SC6H'],
      steps: ['speak="左前"'],
      speakKeywords: ['左前'],
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

  it('默认项与车型差异项分开，标题原样保留', () => {
    const plan = planOutputConcepts(scenarios, 'SC6H')
    expect(plan.defaults.map((concept) => concept.heading)).toEqual([
      '媒体音源播放时检查出声位置是否正确',
    ])
    expect(plan.vehicleSpecific.map((concept) => concept.heading)).toEqual([
      '媒体音源播放时检查出声位置是否正确',
    ])
    expect(plan.vehicleSpecific[0]?.steps[0]?.text).toBe('speak="左前"')
  })

  it('同名项合并时由车型版本替换默认项，标题不被改写', () => {
    const plan = planOutputConcepts(scenarios, 'SC6H')
    const merged = mergeVehicleConcepts(plan.defaults, plan.vehicleSpecific)
    expect(merged.concepts.map((concept) => concept.heading)).toEqual([
      '媒体音源播放时检查出声位置是否正确',
    ])
    expect(merged.concepts[0]?.steps[0]?.text).toBe('speak="左前"')
    expect(merged.replaced).toEqual(['媒体音源播放时检查出声位置是否正确'])
  })
})

describe('planSlotConcepts', () => {
  const plans: SlotMappingPlan[] = [
    {
      name: 'SLOT映射（默认）.txt',
      filePath: '/default.txt',
      vehicles: [],
      scenarios: [
        { title: '媒体音SLOT', steps: ['音源盒打开SLOT1'], slots: [1], hasNonSlotSteps: false },
      ],
    },
    {
      name: 'SLOT映射（带杜比模式）.txt',
      filePath: '/x.txt',
      vehicles: ['SC6H'],
      scenarios: [
        {
          title: '媒体音SLOT',
          steps: ['音源盒打开SLOT1', '音源盒打开SLOT2'],
          slots: [1, 2],
          hasNonSlotSteps: false,
        },
        {
          title: '杜比音SLOT',
          steps: ['音源盒打开SLOT1', '音源盒打开SLOT2'],
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
        { title: '媒体音SLOT', steps: ['音源盒打开SLOT3'], slots: [3], hasNonSlotSteps: false },
      ],
    },
  ]

  it('不带适用车型的方案进默认项，标题不带方案名前缀', () => {
    const plan = planSlotConcepts(plans, 'SC6H')
    expect(plan.defaults.map((concept) => concept.heading)).toEqual(['媒体音SLOT'])
    expect(plan.vehicleSpecific.map((concept) => concept.heading)).toEqual([
      '媒体音SLOT',
      '杜比音SLOT',
    ])

    const merged = mergeVehicleConcepts(plan.defaults, plan.vehicleSpecific)
    // 同名的媒体音SLOT 被车型版本替换，杜比音SLOT 追加
    expect(merged.concepts.map((concept) => concept.heading)).toEqual(['媒体音SLOT', '杜比音SLOT'])
    expect(merged.concepts[0]?.steps).toHaveLength(2)
    expect(merged.replaced).toEqual(['媒体音SLOT'])
    expect(merged.appended).toEqual(['杜比音SLOT'])
  })

  it('车型不适用时不产出差异项', () => {
    const plan = planSlotConcepts(plans, '不存在车型')
    expect(plan.vehicleSpecific).toEqual([])
  })
})
