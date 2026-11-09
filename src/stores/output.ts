import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { OutputDocument, OutputScenario } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'
import { serializeOutputScenarios } from '@/spec/output-file'

export type OutputSaveResult = { ok: true } | { ok: false; error: string }

/**
 * 出声位置数据：应用启动、切换项目时从项目设置指向的「出声位置文件」读回来。
 *
 * 场景支持增 / 改 / 删：改动先序列化成整份文本写回文件，再重新读回，
 * 界面始终以盘上的解析结果为准（speak / no_speak 关键字也由读取侧重新提取）。
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
      for (const speaker of scenario.speakKeywords) names.add(speaker)
    }
    return names.size
  })
  const saving = ref(false)

  /** 场景候选车型：现有场景里出现过的车型 */
  const vehicleOptions = computed(() => {
    const names = new Set<string>()
    for (const scenario of scenarios.value) {
      for (const vehicle of scenario.vehicles) names.add(vehicle)
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  })

  /** 整份写回场景列表 */
  async function saveScenarios(next: OutputScenario[]): Promise<OutputSaveResult> {
    const api = window.desktop?.output
    if (!api?.save) return { ok: false, error: '出声位置只在桌面端可编辑' }

    saving.value = true
    try {
      const outcome = await api.save(serializeOutputScenarios(next))
      if (outcome.saved) {
        await data.load()
        return { ok: true }
      }
      return { ok: false, error: outcome.error ?? '保存出声位置失败' }
    } finally {
      saving.value = false
    }
  }

  async function addScenario(scenario: OutputScenario): Promise<OutputSaveResult> {
    return saveScenarios([...scenarios.value, scenario])
  }

  async function updateScenario(index: number, scenario: OutputScenario): Promise<OutputSaveResult> {
    const current = scenarios.value
    if (index < 0 || index >= current.length) return { ok: false, error: '该场景已不存在' }
    return saveScenarios(current.map((item, itemIndex) => (itemIndex === index ? scenario : item)))
  }

  async function removeScenario(index: number): Promise<OutputSaveResult> {
    const current = scenarios.value
    if (index < 0 || index >= current.length) return { ok: false, error: '该场景已不存在' }
    return saveScenarios(current.filter((_, itemIndex) => itemIndex !== index))
  }

  return {
    ...data,
    scenarios,
    hasData,
    scenarioCount,
    speakerCount,
    saving,
    vehicleOptions,
    saveScenarios,
    addScenario,
    updateScenario,
    removeScenario,
  }
})
