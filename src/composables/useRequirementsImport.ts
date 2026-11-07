import { computed, reactive, ref } from 'vue'
import type {
  RequirementSheetProbe,
  RequirementsColumnMapping,
  RequirementsFileInfo,
  RequirementsImportDefaults,
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
  /** 设置页里配置的导入默认参数：文件、工作表与列位置，空 / 0 表示自动探测 */
  const defaults = ref<RequirementsImportDefaults | null>(null)
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

  /**
   * 套用设置页的导入默认参数。
   *
   * 还没选表时用它预填输入框；已经选了表就只记下来，等探测结束后把配置过的列盖回去
   * ——设置里显式填过的位置代表用户意图，优先于自动探测。
   */
  function applyDefaults(next: RequirementsImportDefaults) {
    defaults.value = { ...next }
    if (file.value) return

    if (next.sheetName) sheetName.value = next.sheetName
    if (next.headerRow > 0) mapping.headerRow = next.headerRow
    if (next.idCol) mapping.idCol = next.idCol
    if (next.nameCol) mapping.nameCol = next.nameCol
    if (next.detailCol) mapping.detailCol = next.detailCol
    if (next.vehicleStartCol) mapping.vehicleStartCol = next.vehicleStartCol
  }

  /** 探测结果之上，用设置里配置过的列覆盖 */
  function applyConfiguredColumns() {
    const configured = defaults.value
    if (!configured) return
    if (configured.headerRow > 0) mapping.headerRow = configured.headerRow
    if (configured.idCol) mapping.idCol = configured.idCol
    if (configured.nameCol) mapping.nameCol = configured.nameCol
    if (configured.detailCol) mapping.detailCol = configured.detailCol
    if (configured.vehicleStartCol) mapping.vehicleStartCol = configured.vehicleStartCol
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
      // 设置里配过的工作表优先；否则挑名字像需求表的，省一次手动切换
      const configured = defaults.value?.sheetName
      const preferred =
        configured && outcome.file.sheets.includes(configured)
          ? configured
          : (outcome.file.sheets.find((name) => name.includes('需求')) ?? outcome.file.sheets[0])
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
      const outcome = await api.probe(
        file.value.filePath,
        sheetName.value,
        headerRow ?? (defaults.value?.headerRow || undefined),
      )
      if (outcome.error || !outcome.probe) {
        error.value = outcome.error ?? '表头探测失败'
        probe.value = null
        return
      }
      probe.value = outcome.probe
      Object.assign(mapping, outcome.probe.mapping)
      applyConfiguredColumns()
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
    applyDefaults,
    chooseFile,
    selectSheet,
    inspect,
    updateMapping,
    resetTransient,
    preview,
    save,
  }
}
