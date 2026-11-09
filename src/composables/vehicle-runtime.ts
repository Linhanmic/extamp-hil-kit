import type { RequirementsParseConfig } from '@/models'
import { validateConcepts, serializeConcepts } from '@/spec/concept-file'
import { useConceptsStore } from '@/stores/concepts'
import { useConfigsStore } from '@/stores/configs'
import { useOutputStore } from '@/stores/output'
import { useRequirementsStore } from '@/stores/requirements'
import { useSettingsStore } from '@/stores/settings'
import { useSlotMapStore } from '@/stores/slotMap'
import { useSpecsStore } from '@/stores/specs'
import { buildVehicleConcepts, planOutputConcepts, planSlotConcepts, summarizeMerge } from './vehicle-assets'

export interface VehicleConfigureResult {
  ok: boolean
  steps: string[]
  error?: string
}

function fail(steps: string[], error: string): VehicleConfigureResult {
  return { ok: false, steps, error }
}

/**
 * 运行前完整自动配置：
 * 导入最新需求 → 刷新配置并拦截异常 → 更新车型 tags →
 * 重建出声位置 / SLOT 目标 CPT。
 * value.properties 的 vehicle_model 在主进程执行 Gauge 前写入。
 */
export async function configureVehicleAssets(vehicle: string): Promise<VehicleConfigureResult> {
  const name = vehicle.trim()
  if (!name) return { ok: false, steps: [], error: '未选择运行车型' }

  const settingsStore = useSettingsStore()
  const requirementsStore = useRequirementsStore()
  const configsStore = useConfigsStore()
  const outputStore = useOutputStore()
  const slotStore = useSlotMapStore()
  const specsStore = useSpecsStore()
  const conceptsStore = useConceptsStore()
  const requirementsApi = window.desktop?.requirements
  const conceptsApi = window.desktop?.concepts
  const steps: string[] = []
  let generated = false

  // 1. 导入最新需求（设置里配置了需求分析表时）
  const importConfig = settingsStore.settings.requirementsImport
  if (importConfig.filePath) {
    if (!requirementsApi) return fail(steps, '需求导入只在桌面端可用')
    const config: RequirementsParseConfig = {
      filePath: importConfig.filePath,
      sheetName: importConfig.sheetName,
      headerRow: importConfig.headerRow,
      idCol: importConfig.idCol,
      nameCol: importConfig.nameCol,
      detailCol: importConfig.detailCol,
      vehicleStartCol: importConfig.vehicleStartCol,
    }
    const preview = await requirementsApi.preview(config)
    if (preview.error || !preview.result) {
      return fail(steps, preview.error ?? '需求分析表预览失败')
    }
    const saved = await requirementsApi.save(config)
    if (!saved.saved) return fail(steps, saved.error ?? '需求分析表导入失败')
    steps.push(
      `需求导入：${saved.saved.requirementCount} 条需求 / ${saved.saved.variantCount} 个变体`,
    )
    if (preview.result.warnings.length) {
      steps.push(`需求导入告警：${preview.result.warnings.length} 条`)
    }
  } else {
    steps.push('需求导入：跳过（未配置需求分析表）')
  }
  await requirementsStore.load()
  await configsStore.load()

  // 2. 刷新配置；异常引用阻断运行
  if (configsStore.error) return fail(steps, configsStore.error)
  const errorRows = configsStore.rows.filter((row) => row.status === 'error')
  if (errorRows.length) {
    return fail(
      steps,
      `配置参数存在异常：${errorRows.map((row) => row.config_key).join('、')}`,
    )
  }
  steps.push('配置参数：已刷新')

  // 3. 更新车型 tags
  if (specsStore.changedCount) {
    const result = await specsStore.apply()
    if (!result.ok) return fail(steps, result.error)
    steps.push(`车型 tags：更新 ${result.count} 个 spec 文件`)
  } else {
    steps.push('车型 tags：已是最新')
  }

  // 4. 重建出声位置目标 CPT：默认项 + 车型差异，同名默认项由车型版本替换
  const outputPlan = planOutputConcepts(outputStore.scenarios, name)
  const outputMerge = buildVehicleConcepts(outputPlan)
  if (outputStore.scenarios.length && outputMerge.concepts.length) {
    if (!conceptsApi?.generate) return fail(steps, '目标 CPT 生成只在桌面端可用')
    const issues = validateConcepts(outputMerge.concepts)
    if (issues.length) return fail(steps, issues[0]!.message)
    const outcome = await conceptsApi.generate(
      `${name}.cpt`,
      serializeConcepts(outputMerge.concepts),
    )
    if (!outcome.saved) return fail(steps, outcome.error ?? '出声位置目标 CPT 生成失败')
    steps.push(`出声位置目标 CPT：${outcome.saved.filePath}（${summarizeMerge(outputMerge)}）`)
    generated = true
  } else {
    steps.push('出声位置目标 CPT：跳过（无适用场景）')
  }

  // 5. 重建 SLOT 映射目标 CPT：同样是默认项 + 车型差异合并
  const slotPlan = planSlotConcepts(slotStore.plans, name)
  const slotMerge = buildVehicleConcepts(slotPlan)
  if (slotStore.plans.length && slotMerge.concepts.length) {
    if (!conceptsApi?.generateSlot) return fail(steps, 'SLOT 目标 CPT 生成只在桌面端可用')
    const issues = validateConcepts(slotMerge.concepts)
    if (issues.length) return fail(steps, issues[0]!.message)
    const outcome = await conceptsApi.generateSlot(
      `${name}-SLOT.cpt`,
      serializeConcepts(slotMerge.concepts),
    )
    if (!outcome.saved) return fail(steps, outcome.error ?? 'SLOT 目标 CPT 生成失败')
    steps.push(`SLOT 映射目标 CPT：${outcome.saved.filePath}（${summarizeMerge(slotMerge)}）`)
    generated = true
  } else {
    steps.push('SLOT 映射目标 CPT：跳过（无适用映射）')
  }

  if (generated) await conceptsStore.load()
  return { ok: true, steps }
}
