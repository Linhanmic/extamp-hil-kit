import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { OutputDocument } from '@/models'

/**
 * 出声位置数据：应用启动、切换项目时从项目设置指向的「出声位置文件」读回来。
 * 只做展示，没有写回；路径没配置时标记为 unconfigured，由页面提示去设置页配置。
 */
export const useOutputStore = defineStore('output', () => {
  const document = ref<OutputDocument | null>(null)
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  const unconfigured = ref(false)

  const scenarios = computed(() => document.value?.scenarios ?? [])
  const hasData = computed(() => scenarios.value.length > 0)
  const scenarioCount = computed(() => scenarios.value.length)
  const speakerCount = computed(() => {
    const names = new Set<string>()
    for (const scenario of scenarios.value) {
      for (const speaker of scenario.speakers) names.add(speaker)
    }
    return names.size
  })

  async function load() {
    const api = window.desktop?.output
    // 浏览器里跑（npm run preview）没有主进程，保持空状态
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
      error.value = '读取出声位置失败'
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
    scenarios,
    hasData,
    scenarioCount,
    speakerCount,
    load,
    clear,
  }
})
