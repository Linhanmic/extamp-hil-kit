import type { SlotMappingPlan } from '@/models'

/** 连续 SLOT 用 - 连接，非连续段用 、分隔；无 SLOT 显示 - */
export function formatSlots(slots: number[]): string {
  const sorted = [...new Set(slots)].sort((a, b) => a - b)
  if (!sorted.length) return '-'

  const ranges: string[] = []
  let start = sorted[0]!
  let end = start
  for (const slot of sorted.slice(1)) {
    if (slot === end + 1) {
      end = slot
      continue
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`)
    start = slot
    end = slot
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`)
  return ranges.join('、')
}

/** 总览矩阵的音源行：按各方案首次出现顺序去重 */
export function sourceTitles(plans: SlotMappingPlan[]): string[] {
  const titles: string[] = []
  for (const plan of plans) {
    for (const scenario of plan.scenarios) {
      if (!titles.includes(scenario.title)) titles.push(scenario.title)
    }
  }
  return titles
}

export function scenarioSlots(plan: SlotMappingPlan, title: string): number[] {
  return plan.scenarios.find((scenario) => scenario.title === title)?.slots ?? []
}
