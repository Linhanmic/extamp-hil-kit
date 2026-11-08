import type { RequirementsParseConfig } from '@/models'
import { validateConcepts, serializeConcepts } from '@/spec/concept-file'
import { useConceptsStore } from '@/stores/concepts'
import { useConfigsStore } from '@/stores/configs'
import { useOutputStore } from '@/stores/output'
import { useRequirementsStore } from '@/stores/requirements'
import { useSettingsStore } from '@/stores/settings'
import { useSlotMapStore } from '@/stores/slotMap'
import { useSpecsStore } from '@/stores/specs'
import { buildOutputConcepts, buildSlotConcepts } from './vehicle-assets'

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

  // 4. 重建出声位置目标 CPT
  const outputConcepts = buildOutputConcepts(outputStore.scenarios, name)
  if (outputStore.scenarios.length && outputConcepts.length) {
    if (!conceptsApi?.generate) return fail(steps, '目标 CPT 生成只在桌面端可用')
    const issues = validateConcepts(outputConcepts)
    if (issues.length) return fail(steps, issues[0]!.message)
    const outcome = await conceptsApi.generate(`${name}.cpt`, serializeConcepts(outputConcepts))
    if (!outcome.saved) return fail(steps, outcome.error ?? '出声位置目标 CPT 生成失败')
    steps.push(`出声位置目标 CPT：${outcome.saved.filePath}`)
    generated = true
  } else {
    steps.push('出声位置目标 CPT：跳过（无适用场景）')
  }

  // 5. 重建 SLOT 映射目标 CPT
  const slotConcepts = buildSlotConcepts(slotStore.plans, name)
  if (slotStore.plans.length && slotConcepts.length) {
    if (!conceptsApi?.generateSlot) return fail(steps, 'SLOT 目标 CPT 生成只在桌面端可用')
    const issues = validateConcepts(slotConcepts)
    if (issues.length) return fail(steps, issues[0]!.message)
    const outcome = await conceptsApi.generateSlot(
      `${name}-SLOT.cpt`,
      serializeConcepts(slotConcepts),
    )
    if (!outcome.saved) return fail(steps, outcome.error ?? 'SLOT 目标 CPT 生成失败')
    steps.push(`SLOT 映射目标 CPT：${outcome.saved.filePath}`)
    generated = true
  } else {
    steps.push('SLOT 映射目标 CPT：跳过（无适用映射）')
  }

  if (generated) await conceptsStore.load()
  return { ok: true, steps }
}
