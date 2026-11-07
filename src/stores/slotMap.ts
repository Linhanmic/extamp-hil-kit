import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SlotMappingDocument } from '@/models'

/**
 * SLOT 映射数据：应用启动、切换项目时从项目设置指向的「SLOT 映射配置」读回来，
 * 连同映射里指向的 slot 文件内容一起展示。只做展示，没有写回。
 */
export const useSlotMapStore = defineStore('slotMap', () => {
  const document = ref<SlotMappingDocument | null>(null)
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  const unconfigured = ref(false)

  const entries = computed(() => document.value?.entries ?? [])
  const hasData = computed(() => entries.value.length > 0)
  const entryCount = computed(() => entries.value.length)
  const missingCount = computed(() => entries.value.filter((entry) => entry.missing).length)

  async function load() {
    const api = window.desktop?.slotMap
    if (!api?.load) {
      loaded.value = true
      return
    }

    loading.value = true
    error.value = ''
    unconfigured.value = false
    try {
      const outcome = await api.load()
      document.value = outcome.document ?? null
      if (outcome.unconfigured) unconfigured.value = true
      if (outcome.error) error.value = outcome.error
    } catch {
      document.value = null
      error.value = '读取 SLOT 映射失败'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  function clear() {
    document.value = null
    error.value = ''
    loaded.value = false
    unconfigured.value = false
  }

  return {
    document,
    loading,
    error,
    loaded,
    unconfigured,
    entries,
    hasData,
    entryCount,
    missingCount,
    load,
    clear,
  }
})
