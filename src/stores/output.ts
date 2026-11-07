import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { OutputDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 出声位置数据：应用启动、切换项目时从项目设置指向的「出声位置文件」读回来。
 * 只做展示，没有写回；路径没配置时标记为 unconfigured，由页面提示去设置页配置。
 * 加载骨架复用 useAsyncData，这里只保留领域计算属性。
 */
export const useOutputStore = defineStore('output', () => {
  const data = useAsyncData<OutputDocument>(
    () => window.desktop?.output?.load?.(),
    '读取出声位置失败',
  )

  const scenarios = computed(() => data.document.value?.scenarios ?? [])
  const hasData = computed(() => scenarios.value.length > 0)
  const scenarioCount = computed(() => scenarios.value.length)
  const speakerCount = computed(() => {
    const names = new Set<string>()
    for (const scenario of scenarios.value) {
      for (const speaker of scenario.speakers) names.add(speaker)
    }
    return names.size
  })

  return { ...data, scenarios, hasData, scenarioCount, speakerCount }
})
