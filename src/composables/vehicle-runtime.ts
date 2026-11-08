import { validateConcepts, serializeConcepts } from '@/spec/concept-file'
import { useConceptsStore } from '@/stores/concepts'
import { useOutputStore } from '@/stores/output'
import { useSlotMapStore } from '@/stores/slotMap'
import { useSpecsStore } from '@/stores/specs'
import { buildOutputConcepts, buildSlotConcepts } from './vehicle-assets'

export interface VehicleConfigureResult {
  ok: boolean
  steps: string[]
  error?: string
}

/**
 * 运行前按车型自动配置资产：
 * 1. 重建出声位置目标 CPT
 * 2. 重建 SLOT 映射目标 CPT
 * 3. 更新全部场景的车型 tags
 * 返回步骤与错误，调用方决定是否继续运行。
 */
export async function configureVehicleAssets(vehicle: string): Promise<VehicleConfigureResult> {
  const name = vehicle.trim()
  if (!name) return { ok: false, steps: [], error: '未选择运行车型' }

  const outputStore = useOutputStore()
  const slotStore = useSlotMapStore()
  const specsStore = useSpecsStore()
  const conceptsStore = useConceptsStore()
  const api = window.desktop?.concepts
  const steps: string[] = []
  let generated = false

  const outputConcepts = buildOutputConcepts(outputStore.scenarios, name)
  if (outputStore.scenarios.length && outputConcepts.length) {
    if (!api?.generate) return { ok: false, steps, error: '目标 CPT 生成只在桌面端可用' }
    const issues = validateConcepts(outputConcepts)
    if (issues.length) return { ok: false, steps, error: issues[0]!.message }
    const outcome = await api.generate(`${name}.cpt`, serializeConcepts(outputConcepts))
    if (!outcome.saved) return { ok: false, steps, error: outcome.error ?? '出声位置目标 CPT 生成失败' }
    steps.push(`出声位置目标 CPT：${outcome.saved.filePath}`)
    generated = true
  } else {
    steps.push('出声位置目标 CPT：跳过（无适用场景）')
  }

  const slotConcepts = buildSlotConcepts(slotStore.plans, name)
  if (slotStore.plans.length && slotConcepts.length) {
    if (!api?.generateSlot) return { ok: false, steps, error: 'SLOT 目标 CPT 生成只在桌面端可用' }
    const issues = validateConcepts(slotConcepts)
    if (issues.length) return { ok: false, steps, error: issues[0]!.message }
    const outcome = await api.generateSlot(`${name}-SLOT.cpt`, serializeConcepts(slotConcepts))
    if (!outcome.saved) return { ok: false, steps, error: outcome.error ?? 'SLOT 目标 CPT 生成失败' }
    steps.push(`SLOT 映射目标 CPT：${outcome.saved.filePath}`)
    generated = true
  } else {
    steps.push('SLOT 映射目标 CPT：跳过（无适用映射）')
  }

  if (specsStore.changedCount) {
    const result = await specsStore.apply()
    if (!result.ok) return { ok: false, steps, error: result.error }
    steps.push(`车型 tags：更新 ${result.count} 个 spec 文件`)
  } else {
    steps.push('车型 tags：已是最新')
  }

  if (generated) await conceptsStore.load()
  return { ok: true, steps }
}
