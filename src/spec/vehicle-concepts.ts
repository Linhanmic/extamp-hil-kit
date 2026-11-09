/**
 * 车型封装合并：默认封装 + 车型差异封装 → 目标 CPT 的一份内容。
 *
 * 车型差异不改写封装内容——标题、步骤、表格原样照抄，只在「同名标题」处用车型版本
 * 替换默认版本（默认项不带适用车型，车型项带上该车型的差异实现）。这样目标 CPT 始终
 * 只有一份，spec 侧用统一概念名引用，切换车型时靠替换默认项实现。纯函数便于单测。
 */
import type { Concept } from './concept-file'

/** 合并结果：内容 + 可回到界面的合并摘要 */
export interface MergedConcepts {
  concepts: Concept[]
  /** 默认项被车型版本替换掉的标题 */
  replaced: string[]
  /** 默认里没有、只由车型差异补进来的标题 */
  appended: string[]
  /** 同一类（默认或车型差异）内部标题重复、后者覆盖前者的标题 */
  conflicts: string[]
}

function headingKey(concept: Concept): string {
  return concept.heading.trim()
}

/**
 * 合并默认封装与车型差异封装。
 *
 * 1. 默认封装先落地，同名重复的默认项由后者覆盖并记进 `conflicts`；
 * 2. 车型差异封装依次合并：命中默认项 → 就位替换；否则追加；
 * 3. 车型差异内部同名同样由后者覆盖。
 */
export function mergeVehicleConcepts(
  defaults: Concept[],
  vehicleSpecific: Concept[],
): MergedConcepts {
  const result: Concept[] = []
  const indexByHeading = new Map<string, number>()
  const fromVehicle = new Set<number>()
  const replaced: string[] = []
  const appended: string[] = []
  const conflicts: string[] = []

  const collect = (concept: Concept, source: 'default' | 'vehicle') => {
    const key = headingKey(concept)
    const existing = indexByHeading.get(key)
    if (existing === undefined) {
      indexByHeading.set(key, result.length)
      result.push(concept)
      if (source === 'vehicle') {
        fromVehicle.add(result.length - 1)
        appended.push(key)
      }
      return
    }
    if (source === 'vehicle' && !fromVehicle.has(existing)) {
      result[existing] = concept
      fromVehicle.add(existing)
      replaced.push(key)
      return
    }
    result[existing] = concept
    if (!conflicts.includes(key)) conflicts.push(key)
  }

  for (const concept of defaults) collect(concept, 'default')
  for (const concept of vehicleSpecific) collect(concept, 'vehicle')

  return { concepts: result, replaced, appended, conflicts }
}
