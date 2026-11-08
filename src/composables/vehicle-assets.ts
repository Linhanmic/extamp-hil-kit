import { extractParams, type Concept } from '@/spec/concept-file'
import type { OutputScenario } from '@/models/output'
import type { SlotMappingPlan } from '@/models/slot-map'

/** 为指定车型构建出声位置目标 CPT 内容；无步骤场景跳过 */
export function buildOutputConcepts(
  scenarios: OutputScenario[],
  vehicle: string,
): Concept[] {
  return scenarios
    .filter(
      (scenario) =>
        (scenario.allVehicles || scenario.vehicles.includes(vehicle)) && scenario.steps.length,
    )
    .map((scenario) => ({
      heading: scenario.title || '未命名场景',
      params: extractParams(scenario.title),
      steps: scenario.steps.map((text) => ({ text, table: null })),
    }))
}

/** 为指定车型构建 SLOT 映射目标 CPT 内容；无步骤场景跳过 */
export function buildSlotConcepts(plans: SlotMappingPlan[], vehicle: string): Concept[] {
  return plans
    .filter((plan) => plan.vehicles.includes(vehicle))
    .flatMap((plan) =>
      plan.scenarios
        .filter((scenario) => scenario.steps.length)
        .map((scenario) => ({
          heading: `${plan.name.replace(/\.txt$/i, '')} · ${scenario.title}`,
          params: extractParams(scenario.title),
          steps: scenario.steps.map((text) => ({ text, table: null })),
        })),
    )
}
