import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SlotMappingDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'
import {
  serializeSlotMappingPlan,
  type SlotPlanScenarioInput,
} from '@/spec/slot-mapping-file'

export type SlotMapSaveResult = { ok: true } | { ok: false; error: string }

/**
 * SLOT 映射数据：应用启动、切换项目时从项目设置指向的「SLOT 映射目录」读回来，
 * 目录下每个 txt 解析为一种映射方案。
 *
 * 方案支持新建 / 编辑 / 删除，场景在方案表单里一起维护；写回后重新读回，
 * SLOT 通道号与非 SLOT 步骤由读取侧重新解析。
 */
export const useSlotMapStore = defineStore('slotMap', () => {
  const data = useAsyncData<SlotMappingDocument>(
    () => window.desktop?.slotMap?.load?.(),
    '读取 SLOT 映射失败',
  )

  const plans = computed(() => data.document.value?.plans ?? [])
  const hasData = computed(() => plans.value.length > 0)
  const planCount = computed(() => plans.value.length)
  const errorPlanCount = computed(() => plans.value.filter((plan) => plan.error).length)
  const saving = ref(false)

  function planNames(): string[] {
    return plans.value.map((plan) => plan.name)
  }

  /** 新增或整份写回一个映射方案文件 */
  async function savePlan(
    fileName: string,
    vehicles: string[],
    scenarios: SlotPlanScenarioInput[],
    options: { create?: boolean } = {},
  ): Promise<SlotMapSaveResult> {
    const api = window.desktop?.slotMap
    if (!api?.save) return { ok: false, error: 'SLOT 映射只在桌面端可编辑' }

    const name = fileName.trim()
    if (!name) return { ok: false, error: '方案文件名不能为空' }
    if (!name.toLowerCase().endsWith('.txt')) return { ok: false, error: '方案文件名需以 .txt 结尾' }
    if (options.create && planNames().includes(name)) {
      return { ok: false, error: `方案「${name}」已存在` }
    }
    if (!scenarios.length) return { ok: false, error: '方案至少需要一个音源场景' }

    saving.value = true
    try {
      const outcome = await api.save(name, serializeSlotMappingPlan(vehicles, scenarios))
      if (outcome.saved) {
        await data.load()
        return { ok: true }
      }
      return { ok: false, error: outcome.error ?? '保存 SLOT 映射方案失败' }
    } finally {
      saving.value = false
    }
  }

  /** 删除一个映射方案文件 */
  async function deletePlan(fileName: string): Promise<SlotMapSaveResult> {
    const api = window.desktop?.slotMap
    if (!api?.delete) return { ok: false, error: 'SLOT 映射只在桌面端可编辑' }

    saving.value = true
    try {
      const outcome = await api.delete(fileName)
      if (outcome.deleted) {
        await data.load()
        return { ok: true }
      }
      return { ok: false, error: outcome.error ?? '删除 SLOT 映射方案失败' }
    } finally {
      saving.value = false
    }
  }

  return {
    ...data,
    plans,
    hasData,
    planCount,
    errorPlanCount,
    saving,
    savePlan,
    deletePlan,
  }
})
