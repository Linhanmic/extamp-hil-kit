import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { SlotMappingDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * SLOT 映射数据：应用启动、切换项目时从项目设置指向的「SLOT 映射目录」读回来，
 * 目录下每个 txt 解析为一种映射方案，供总览矩阵与详情视图展示。只做展示，没有写回。
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

  return { ...data, plans, hasData, planCount, errorPlanCount }
})
