import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { RequirementsDocument } from '@/models'

/**
 * 已导入的需求数据：应用启动、切换项目时从 `<项目>/.hil-kit/requirements.json` 读回来，
 * 导入完成后刷新。跨组件共享的领域数据放 store，一次性的解析流程状态留在
 * `composables/useRequirementsImport.ts`。
 */
export const useRequirementsStore = defineStore('requirements', () => {
  const document = ref<RequirementsDocument | null>(null)
  const loading = ref(false)
  /** 文件存在但不可用（损坏 / 版本不支持），提示用户重新导入 */
  const error = ref('')
  /** 是否已经尝试过读取，用于区分「还没读」与「读到了但没有数据」 */
  const loaded = ref(false)

  const hasData = computed(() => Boolean(document.value?.requirements.length))
  const requirementCount = computed(() => document.value?.requirements.length ?? 0)
  const variantCount = computed(
    () =>
      document.value?.requirements.reduce(
        (sum, requirement) => sum + requirement.variants.length,
        0,
      ) ?? 0,
  )
  /** 从各变体的 vehicles 汇总去重后的车型数（落盘不带车型全集） */
  const vehicleCount = computed(() => {
    const names = new Set<string>()
    for (const requirement of document.value?.requirements ?? []) {
      for (const variant of requirement.variants) {
        for (const vehicle of variant.vehicles) names.add(vehicle)
      }
    }
    return names.size
  })

  const mapping = computed(() => document.value?.mapping ?? {})

  /** 需求是否参与参数映射；缺省参与 */
  function isParticipating(requirementId: string): boolean {
    return mapping.value[requirementId] !== false
  }

  /** 更新映射参与状态并写回 requirements.json */
  async function setParticipating(
    requirementId: string,
    participating: boolean,
  ): Promise<{ ok: boolean; error?: string }> {
    const api = window.desktop?.requirements
    if (!api?.saveMapping) return { ok: false, error: '映射状态只在桌面端可保存' }

    const next = { ...mapping.value }
    if (participating) delete next[requirementId]
    else next[requirementId] = false

    const outcome = await api.saveMapping(next)
    if (!outcome.saved) return { ok: false, error: outcome.error ?? '保存映射状态失败' }
    if (document.value) {
      document.value = {
        ...document.value,
        mapping: next,
        updatedAt: outcome.saved.updatedAt,
      }
    }
    return { ok: true }
  }

  async function load() {
    const api = window.desktop?.requirements
    // 浏览器里跑（npm run preview）没有主进程，保持空状态
    if (!api?.load) {
      loaded.value = true
      return
    }

    loading.value = true
    error.value = ''
    try {
      const outcome = await api.load()
      document.value = outcome.document ?? null
      if (outcome.error) error.value = outcome.error
    } catch {
      document.value = null
      error.value = '读取已导入的需求数据失败'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  /** 切换 / 解绑项目时清空，避免把上一个项目的数据当当前项目的 */
  function clear() {
    document.value = null
    error.value = ''
    loaded.value = false
  }

  return {
    document,
    loading,
    error,
    loaded,
    hasData,
    requirementCount,
    variantCount,
    vehicleCount,
    mapping,
    isParticipating,
    setParticipating,
    load,
    clear,
  }
})
