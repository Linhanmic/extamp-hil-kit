import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SnapshotDocument } from '@/models'

/**
 * 扬声器快照数据：应用启动、切换项目时从项目设置指向的「扬声器快照目录」读回来，
 * 列出目录下所有快照文件与通道对应关系。只做展示，没有写回。
 */
export const useSnapshotStore = defineStore('snapshot', () => {
  const document = ref<SnapshotDocument | null>(null)
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  const unconfigured = ref(false)

  const files = computed(() => document.value?.files ?? [])
  const hasData = computed(() => files.value.length > 0)
  const fileCount = computed(() => files.value.length)
  const channelCount = computed(() =>
    files.value.reduce((sum, file) => sum + file.channels.length, 0),
  )

  async function load() {
    const api = window.desktop?.snapshot
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
      error.value = '读取扬声器快照失败'
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
    files,
    hasData,
    fileCount,
    channelCount,
    load,
    clear,
  }
})
