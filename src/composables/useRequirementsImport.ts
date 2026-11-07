import { computed, reactive, ref } from 'vue'
import type {
  RequirementSheetProbe,
  RequirementsColumnMapping,
  RequirementsFileInfo,
  RequirementsParseConfig,
  RequirementsParseResult,
  RequirementsSavedState,
} from '@/models'

/** 初始列配置：首次选表后会被表头探测结果覆盖 */
const DEFAULT_MAPPING: RequirementsColumnMapping = {
  headerRow: 2,
  idCol: 'A',
  nameCol: 'B',
  detailCol: 'E',
  vehicleStartCol: 'G',
}

/**
 * 需求导入流程状态：选表 → 探测列配置 → 预览 → 写项目目录。
 *
 * 一次导入只在一个页面里用，不做模块级单例；解析与写文件都在主进程，
 * 这里只负责把结果和错误收拢成界面可用的状态。
 */
export function useRequirementsImport() {
  const file = ref<RequirementsFileInfo | null>(null)
  const sheetName = ref('')
  const mapping = reactive<RequirementsColumnMapping>({ ...DEFAULT_MAPPING })
  const probe = ref<RequirementSheetProbe | null>(null)
  const result = ref<RequirementsParseResult | null>(null)
  const saved = ref<RequirementsSavedState | null>(null)
  const error = ref('')
  const busy = ref(false)
  const dirty = ref(false)

  const available = computed(() => Boolean(window.desktop?.requirements))
  // 配置改过之后旧预览就不作数了，避免照着过期结果点导入
  const canPreview = computed(() => Boolean(file.value) && !busy.value)

  const config = computed<RequirementsParseConfig | null>(() => {
    if (!file.value) return null
    return { filePath: file.value.filePath, sheetName: sheetName.value, ...mapping }
  })

  /** 文件名，界面顶部展示用 */
  const fileName = computed(() => {
    const filePath = file.value?.filePath ?? ''
    return filePath.split(/[\\/]/).pop() || filePath
  })

  function resetResult() {
    result.value = null
    saved.value = null
    dirty.value = true
  }

  async function chooseFile() {
    const api = window.desktop?.requirements
    if (!api) {
      error.value = '未检测到桌面端环境，无法读取本地文件（请通过 npm run dev 或安装包启动）'
      return
    }

    busy.value = true
    error.value = ''
    try {
      const outcome = await api.choose()
      if (outcome.canceled) return
      if (outcome.error || !outcome.file) {
        error.value = outcome.error ?? '选择文件失败'
        return
      }
      file.value = outcome.file
      result.value = null
      saved.value = null
      dirty.value = true
      // 优先挑名字像需求表的工作表，省一次手动切换
      const preferred =
        outcome.file.sheets.find((name) => name.includes('需求')) ?? outcome.file.sheets[0]
      sheetName.value = preferred ?? ''
      await inspect()
    } finally {
      busy.value = false
    }
  }

  async function inspect(headerRow?: number) {
    const api = window.desktop?.requirements
    if (!api || !file.value || !sheetName.value) return

    busy.value = true
    error.value = ''
    try {
      const outcome = await api.probe(file.value.filePath, sheetName.value, headerRow)
      if (outcome.error || !outcome.probe) {
        error.value = outcome.error ?? '表头探测失败'
        probe.value = null
        return
      }
      probe.value = outcome.probe
      Object.assign(mapping, outcome.probe.mapping)
      result.value = null
      saved.value = null
      dirty.value = false
    } finally {
      busy.value = false
    }
  }

  async function selectSheet(name: string) {
    sheetName.value = name
    await inspect()
  }

  /** 任一列配置被改动：探测结论与预览都失效 */
  function updateMapping(patch: Partial<RequirementsColumnMapping>) {
    Object.assign(mapping, patch)
    resetResult()
  }

  /**
   * 关掉导入弹窗时清理一次性的结果。
   *
   * 文件、工作表与列映射保留，下次打开可以接着用；预览结果、落盘摘要与错误清掉，
   * 避免重新打开时还挂着上一次的「已导入」提示。
   */
  function resetTransient() {
    result.value = null
    saved.value = null
    error.value = ''
    dirty.value = false
  }

  async function preview() {
    const api = window.desktop?.requirements
    const current = config.value
    if (!api || !current) return

    busy.value = true
    error.value = ''
    try {
      const outcome = await api.preview(current)
      if (outcome.error || !outcome.result) {
        error.value = outcome.error ?? '解析失败'
        result.value = null
        return
      }
      result.value = outcome.result
      saved.value = null
      dirty.value = false
    } finally {
      busy.value = false
    }
  }

  async function save() {
    const api = window.desktop?.requirements
    const current = config.value
    if (!api || !current) return

    busy.value = true
    error.value = ''
    try {
      const outcome = await api.save(current)
      if (outcome.error || !outcome.saved) {
        error.value = outcome.error ?? '导入失败'
        return
      }
      saved.value = outcome.saved
      dirty.value = false
      // 预览已经落盘，改由 requirements store 展示当前数据，不再挂第二份状态
      result.value = null
    } finally {
      busy.value = false
    }
  }

  return {
    file,
    fileName,
    sheetName,
    mapping,
    probe,
    result,
    saved,
    error,
    busy,
    available,
    canPreview,
    dirty,
    chooseFile,
    selectSheet,
    inspect,
    updateMapping,
    resetTransient,
    preview,
    save,
  }
}
