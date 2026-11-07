import { describe, expect, it } from 'vitest'
import { formatSlots, scenarioSlots, sourceTitles } from '../slot-map-format'
import type { SlotMappingPlan } from '@/models'

describe('formatSlots', () => {
  it('连续 SLOT 用短横线，非连续用顿号，空值用短横线', () => {
    expect(formatSlots([1, 2, 3, 5, 7, 8, 13])).toBe('1-3、5、7-8、13')
    expect(formatSlots([13, 1, 2, 13])).toBe('1-2、13')
    expect(formatSlots([])).toBe('-')
  })
})

describe('总览矩阵辅助', () => {
  const plans: SlotMappingPlan[] = [
    {
      name: '方案A',
      filePath: '/a',
      vehicles: [],
      scenarios: [
        { title: '媒体音立体声', steps: ['音源盒打开SLOT1', '音源盒打开SLOT2'], slots: [1, 2], hasNonSlotSteps: false },
        { title: '电话音', steps: ['音源盒打开SLOT13'], slots: [13], hasNonSlotSteps: false },
      ],
    },
    {
      name: '方案B',
      filePath: '/b',
      vehicles: [],
      scenarios: [{ title: '媒体音立体声', steps: ['音源盒打开SLOT3', '音源盒打开SLOT4'], slots: [3, 4], hasNonSlotSteps: false }],
    },
  ]

  it('音源按首次出现顺序去重，未出现的场景按无 SLOT', () => {
    expect(sourceTitles(plans)).toEqual(['媒体音立体声', '电话音'])
    expect(scenarioSlots(plans[1]!, '媒体音立体声')).toEqual([3, 4])
    expect(scenarioSlots(plans[1]!, '电话音')).toEqual([])
  })
})
