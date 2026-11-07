import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { SlotMappingDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * SLOT 映射数据：应用启动、切换项目时从项目设置指向的「SLOT 映射配置」读回来，
 * 连同映射里指向的 slot 文件内容一起展示。只做展示，没有写回。加载骨架复用 useAsyncData。
 */
export const useSlotMapStore = defineStore('slotMap', () => {
  const data = useAsyncData<SlotMappingDocument>(
    () => window.desktop?.slotMap?.load?.(),
    '读取 SLOT 映射失败',
  )

  const entries = computed(() => data.document.value?.entries ?? [])
  const hasData = computed(() => entries.value.length > 0)
  const entryCount = computed(() => entries.value.length)
  const missingCount = computed(() => entries.value.filter((entry) => entry.missing).length)

  return { ...data, entries, hasData, entryCount, missingCount }
})
