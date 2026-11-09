import { extractParams, type Concept } from '@/spec/concept-file'
import { mergeVehicleConcepts, type MergedConcepts } from '@/spec/vehicle-concepts'
import type { OutputScenario } from '@/models/output'
import type { SlotMappingPlan } from '@/models/slot-map'

/**
 * 一个资产的生成计划：默认项（不带适用车型，所有车型通用）与当前车型的差异项。
 *
 * 生成文件不改写内容——封装标题就是源文件里的场景标题，不在前面拼车型名或方案名，
 * 这样默认项与车型项才能按同名标题一一替换。
 */
export interface VehicleConceptPlan {
  defaults: Concept[]
  vehicleSpecific: Concept[]
}

function conceptOf(title: string, steps: string[]): Concept {
  return {
    heading: title || '未命名场景',
    params: extractParams(title),
    steps: steps.map((text) => ({ text, table: null })),
  }
}

/** 出声位置：未写适用车型的场景是默认项，写了适用车型且命中当前车型的是差异项 */
export function planOutputConcepts(
  scenarios: OutputScenario[],
  vehicle: string,
): VehicleConceptPlan {
  const defaults: Concept[] = []
  const vehicleSpecific: Concept[] = []
  for (const scenario of scenarios) {
    if (!scenario.steps.length) continue
    if (scenario.allVehicles) {
      defaults.push(conceptOf(scenario.title, scenario.steps))
    } else if (vehicle && scenario.vehicles.includes(vehicle)) {
      vehicleSpecific.push(conceptOf(scenario.title, scenario.steps))
    }
  }
  return { defaults, vehicleSpecific }
}

/** SLOT 映射：没有适用车型的方案是默认项，命中当前车型的方案是差异项 */
export function planSlotConcepts(plans: SlotMappingPlan[], vehicle: string): VehicleConceptPlan {
  const defaults: Concept[] = []
  const vehicleSpecific: Concept[] = []
  for (const plan of plans) {
    const appliesToAll = plan.vehicles.length === 0
    const appliesToVehicle = Boolean(vehicle) && plan.vehicles.includes(vehicle)
    if (!appliesToAll && !appliesToVehicle) continue
    for (const scenario of plan.scenarios) {
      if (!scenario.steps.length) continue
      const concept = conceptOf(scenario.title, scenario.steps)
      if (appliesToAll) defaults.push(concept)
      else vehicleSpecific.push(concept)
    }
  }
  return { defaults, vehicleSpecific }
}

/** 生成计划 → 目标 CPT 内容：车型差异项替换同名默认项 */
export function buildVehicleConcepts(plan: VehicleConceptPlan): MergedConcepts {
  return mergeVehicleConcepts(plan.defaults, plan.vehicleSpecific)
}

/** 合并摘要，用于生成结果提示（如「封装 3 个，替换默认项 1 个，追加车型项 1 个」） */
export function summarizeMerge(merged: MergedConcepts): string {
  const parts = [`封装 ${merged.concepts.length} 个`]
  if (merged.replaced.length) parts.push(`替换默认项 ${merged.replaced.length} 个`)
  if (merged.appended.length) parts.push(`追加车型项 ${merged.appended.length} 个`)
  if (merged.conflicts.length) parts.push(`同名覆盖 ${merged.conflicts.length} 个`)
  return parts.join('，')
}