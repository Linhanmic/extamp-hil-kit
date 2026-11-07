import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { ResolvedRef } from '@/spec/condition'
import { analyzeSpec, type SpecAnalysis } from '@/spec/spec-file'
import { useConfigsStore } from './configs'

/** 一个 spec 文件的原文（合并清单里的名字与读回的文本） */
interface LoadedSpec {
  path: string
  name: string
  text: string
}

/** 一个 spec 文件的解析 + 求值 + 标签更新结果 */
export interface SpecEntry extends LoadedSpec {
  analysis: SpecAnalysis
}

export type ApplyResult = { ok: true; count: number } | { ok: false; error: string }

/**
 * spec 文件与场景标签：应用启动、切换项目时从 `<项目>/specs` 读回，
 * 依据配置参数算出每个场景的适用车型，预览要写入的标签，确认后整份写回。
 *
 * 求值是响应式的：配置参数一改，这里的预览会跟着重算。只读 + 按钮触发写回，
 * 不自动改写用户的 spec 源码。
 */
export const useSpecsStore = defineStore('specs', () => {
  const configsStore = useConfigsStore()

  const files = ref<LoadedSpec[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const loaded = ref(false)

  /** 「配置项-配置值」→ 该配置值的适用车型，供适用条件里的引用解析 */
  const resolverMap = computed(() => {
    const map = new Map<string, string[]>()
    for (const row of configsStore.rows) {
      for (const value of row.values) {
        map.set(`${row.config_key}-${value.value}`, value.resolved.vehicles)
      }
    }
    return map
  })

  function resolveRef(ref: string): ResolvedRef {
    const vehicles = resolverMap.value.get(ref)
    return vehicles === undefined ? { vehicles: [], known: false } : { vehicles, known: true }
  }

  /** 全量车型（未写适用条件时的默认，也是「非」运算的全集） */
  const universe = computed(() => configsStore.vehicleOptions)

  const entries = computed<SpecEntry[]>(() =>
    files.value.map((file) => ({
      ...file,
      analysis: analyzeSpec(file.text, resolveRef, universe.value),
    })),
  )

  const hasData = computed(() => entries.value.length > 0)
  const fileCount = computed(() => entries.value.length)
  const scenarioCount = computed(() =>
    entries.value.reduce((sum, entry) => sum + entry.analysis.parsed.scenarios.length, 0),
  )
  const changedCount = computed(() => entries.value.filter((entry) => entry.analysis.changed).length)
  const notApplicableCount = computed(
    () =>
      entries.value.reduce(
        (sum, entry) => sum + entry.analysis.vehicles.filter((v) => v.length === 0).length,
        0,
      ),
  )
  /** 所有 spec 的失效引用 / 条件写法警告 */
  const warnings = computed(() => {
    const list: string[] = []
    for (const entry of entries.value) {
      for (const warning of entry.analysis.warnings) {
        const item = `${entry.name}：${warning}`
        if (!list.includes(item)) list.push(item)
      }
    }
    return list
  })

  async function load() {
    const api = window.desktop?.specs
    // 浏览器里跑（npm run preview）没有主进程，保持空状态
    if (!api?.list || !api?.read) {
      loaded.value = true
      return
    }

    loading.value = true
    error.value = ''
    try {
      const list = await api.list()
      const infos = list.files ?? []
      const contents: LoadedSpec[] = []
      for (const info of infos) {
        const read = await api.read(info.path)
        if (read.file) contents.push({ path: info.path, name: info.name, text: read.file.text })
      }
      files.value = contents
    } catch {
      files.value = []
      error.value = '读取 spec 文件失败'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  function clear() {
    files.value = []
    error.value = ''
    loaded.value = false
  }

  /** 把算好的标签写回所有有变化的 spec 文件，然后重新读取 */
  async function apply(): Promise<ApplyResult> {
    const api = window.desktop?.specs
    if (!api?.write) return { ok: false, error: 'spec 标签只在桌面端可更新' }

    saving.value = true
    try {
      const changed = entries.value.filter((entry) => entry.analysis.changed)
      for (const entry of changed) {
        const outcome = await api.write(entry.path, entry.analysis.newText)
        if (!outcome.saved) {
          const message = outcome.error ?? `保存「${entry.name}」失败`
          error.value = message
          return { ok: false, error: message }
        }
      }
      await load()
      return { ok: true, count: changed.length }
    } catch {
      const message = '更新 spec 标签失败'
      error.value = message
      return { ok: false, error: message }
    } finally {
      saving.value = false
    }
  }

  return {
    loading,
    saving,
    error,
    loaded,
    entries,
    hasData,
    fileCount,
    scenarioCount,
    changedCount,
    notApplicableCount,
    warnings,
    load,
    clear,
    apply,
  }
})
