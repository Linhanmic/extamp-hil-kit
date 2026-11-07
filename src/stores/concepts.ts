import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Concept, ConceptIssue } from '@/spec/concept-file'
import { parseConceptFile, serializeConcepts, validateConcepts } from '@/spec/concept-file'

/** 一个封装文件的原文 + 结构化解析结果 */
export interface LoadedConceptFile {
  path: string
  name: string
  text: string
  concepts: Concept[]
  issues: ConceptIssue[]
}

export type ConceptSaveResult = { ok: true } | { ok: false; error: string }

/**
 * 封装（Gauge 概念 .cpt）文件：应用启动、切换项目时从 `<项目>/specs` 读回，
 * 解析成结构化封装供列表展示与表单编辑，保存时重新生成 .cpt 文本写回。
 *
 * 只读加载 + 按钮触发写回；浏览器环境（无主进程）保持空状态。
 */
export const useConceptsStore = defineStore('concepts', () => {
  const files = ref<LoadedConceptFile[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const deleting = ref(false)
  const error = ref('')
  const loaded = ref(false)

  const fileCount = computed(() => files.value.length)
  const conceptCount = computed(() =>
    files.value.reduce((sum, file) => sum + file.concepts.length, 0),
  )
  const issueCount = computed(() => files.value.reduce((sum, file) => sum + file.issues.length, 0))

  /** 跨文件的重复封装标题：标题 → 引用它的文件名列表（多于一个即重复） */
  const duplicates = computed(() => {
    const map = new Map<string, string[]>()
    for (const file of files.value) {
      for (const concept of file.concepts) {
        const heading = concept.heading.trim()
        if (!heading) continue
        const names = map.get(heading) ?? []
        if (!names.includes(file.name)) names.push(file.name)
        map.set(heading, names)
      }
    }
    return new Map([...map].filter(([, names]) => names.length > 1))
  })

  /** 扁平的封装清单（带所属文件），供搜索与统计 */
  const entries = computed(() =>
    files.value.flatMap((file) =>
      file.concepts.map((concept, index) => ({ file, concept, index })),
    ),
  )

  async function load() {
    const api = window.desktop?.concepts
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
      const contents: LoadedConceptFile[] = []
      for (const info of infos) {
        const read = await api.read(info.path)
        if (!read.file) continue
        const parsed = parseConceptFile(read.file.text)
        contents.push({
          path: read.file.path,
          name: read.file.name,
          text: read.file.text,
          concepts: parsed.concepts,
          issues: parsed.issues,
        })
      }
      contents.sort((a, b) => a.name.localeCompare(b.name))
      files.value = contents
    } catch {
      files.value = []
      error.value = '读取封装文件失败'
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

  /** 目标文件之外，是否已有同名封装标题 */
  function findConflictHeading(filePath: string, concepts: Concept[]): string | null {
    const seen = new Set<string>()
    for (const concept of concepts) {
      const heading = concept.heading.trim()
      if (!heading || seen.has(heading)) continue
      seen.add(heading)
      for (const file of files.value) {
        if (file.path === filePath) continue
        if (file.concepts.some((c) => c.heading.trim() === heading)) return heading
      }
    }
    return null
  }

  /**
   * 把一组封装整体写回目标文件（相对名或绝对路径均可，主进程会校验落在 specs 内）。
   * 新文件（绝对路径不在现有列表里）也走这里。
   */
  async function saveConcepts(targetPath: string, concepts: Concept[]): Promise<ConceptSaveResult> {
    const api = window.desktop?.concepts
    if (!api?.write) return { ok: false, error: '封装只在桌面端可编辑' }

    const issues = validateConcepts(concepts)
    if (issues.length) return { ok: false, error: issues[0]!.message }

    const conflict = findConflictHeading(targetPath, concepts)
    if (conflict) return { ok: false, error: `封装标题「${conflict}」在其他文件中已存在` }

    saving.value = true
    try {
      const outcome = await api.write(targetPath, serializeConcepts(concepts))
      if (!outcome.saved) {
        const message = outcome.error ?? '保存封装文件失败'
        error.value = message
        return { ok: false, error: message }
      }
      await load()
      return { ok: true }
    } catch {
      const message = '保存封装文件失败'
      error.value = message
      return { ok: false, error: message }
    } finally {
      saving.value = false
    }
  }

  /** 删除一个封装文件 */
  async function deleteFile(filePath: string): Promise<ConceptSaveResult> {
    const api = window.desktop?.concepts
    if (!api?.delete) return { ok: false, error: '封装只在桌面端可编辑' }

    deleting.value = true
    try {
      const outcome = await api.delete(filePath)
      if (!outcome.deleted) {
        const message = outcome.error ?? '删除封装文件失败'
        error.value = message
        return { ok: false, error: message }
      }
      await load()
      return { ok: true }
    } catch {
      const message = '删除封装文件失败'
      error.value = message
      return { ok: false, error: message }
    } finally {
      deleting.value = false
    }
  }

  return {
    loading,
    saving,
    deleting,
    error,
    loaded,
    files,
    entries,
    fileCount,
    conceptCount,
    issueCount,
    duplicates,
    load,
    clear,
    saveConcepts,
    deleteFile,
  }
})
