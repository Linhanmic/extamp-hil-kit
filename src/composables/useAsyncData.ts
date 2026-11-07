import { ref } from 'vue'

/**
 * 只读业务数据的加载结果骨架：主进程回 document / error / unconfigured。
 * 出声位置 / 音量表 / SLOT 映射 / 快照 等只读展示的主进程结果都长这个样。
 */
export interface AsyncDataOutcome<T> {
  document?: T
  error?: string
  unconfigured?: boolean
}

/**
 * 只读业务数据的加载骨架：document / loading / error / loaded / unconfigured + load / clear。
 *
 * 出声位置 / 音量表 / SLOT 映射 / 快照 这几个只读展示的领域 store 之前各写了一份
 * 一模一样的加载骨架，这里合并成一份；各领域 store 只需传入自己的读取函数与错误文案，
 * 再补各自的计算属性即可。浏览器里没有主进程时保持空状态。
 */
export function useAsyncData<T>(
  loadFn: () => Promise<AsyncDataOutcome<T>> | undefined,
  errorMessage: string,
) {
  const document = ref<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  const loaded = ref(false)
  const unconfigured = ref(false)

  async function load() {
    const call = loadFn()
    // 浏览器里跑（npm run preview）没有主进程，保持空状态
    if (!call) {
      loaded.value = true
      return
    }

    loading.value = true
    error.value = ''
    unconfigured.value = false
    try {
      const outcome = await call
      document.value = outcome.document ?? null
      if (outcome.unconfigured) unconfigured.value = true
      if (outcome.error) error.value = outcome.error
    } catch {
      document.value = null
      error.value = errorMessage
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

  return { document, loading, error, loaded, unconfigured, load, clear }
}
