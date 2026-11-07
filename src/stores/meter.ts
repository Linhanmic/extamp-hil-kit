import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { VolumeTableDocument } from '@/models'

/**
 * 音量表数据：应用启动、切换项目时从项目设置指向的「音量表文件」读回来。
 * 只做展示，没有写回。
 */
export const useMeterStore = defineStore('meter', () => {
  const document = ref<VolumeTableDocument | null>(null)
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  const unconfigured = ref(false)

  const levels = computed(() => document.value?.levels ?? [])
  const rows = computed(() => document.value?.rows ?? [])
  const hasData = computed(() => rows.value.length > 0)
  const rowCount = computed(() => rows.value.length)
  const vehicleCount = computed(() => new Set(rows.value.map((row) => row.vehicle)).size)

  async function load() {
    const api = window.desktop?.meter
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
      error.value = '读取音量表失败'
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
    levels,
    rows,
    hasData,
    rowCount,
    vehicleCount,
    load,
    clear,
  }
})
