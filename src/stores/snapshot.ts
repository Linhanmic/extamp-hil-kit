import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SnapshotDocument, SnapshotFile } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'
import { serializeSnapshotSections } from '@/spec/snapshot-file'

export type SnapshotSaveResult = { ok: true } | { ok: false; error: string }

/**
 * 扬声器快照数据：应用启动、切换项目时从项目设置指向的目录读取统一的 `snapshot.ini`，
 * 每个车型分节作为一组快照，展示适用车型与通道对应关系。
 *
 * 分节支持新增 / 编辑 / 删除：改动整份写回 snapshot.ini 后重新读回。
 */
export const useSnapshotStore = defineStore('snapshot', () => {
  const data = useAsyncData<SnapshotDocument>(
    () => window.desktop?.snapshot?.load?.(),
    '读取扬声器快照失败',
  )

  const files = computed(() => data.document.value?.files ?? [])
  const hasData = computed(() => files.value.length > 0)
  const fileCount = computed(() => files.value.length)
  const channelCount = computed(() =>
    files.value.reduce((sum, file) => sum + file.channels.length, 0),
  )
  const saving = ref(false)

  /** 整份写回分节列表 */
  async function saveSections(next: SnapshotFile[]): Promise<SnapshotSaveResult> {
    const api = window.desktop?.snapshot
    if (!api?.save) return { ok: false, error: '扬声器快照只在桌面端可编辑' }

    saving.value = true
    try {
      const outcome = await api.save(serializeSnapshotSections(next))
      if (outcome.saved) {
        await data.load()
        return { ok: true }
      }
      return { ok: false, error: outcome.error ?? '保存扬声器快照失败' }
    } finally {
      saving.value = false
    }
  }

  /** 新增分节：与已有分节重名时拒绝 */
  async function addSection(name: string, speakers: string[]): Promise<SnapshotSaveResult> {
    if (files.value.some((file) => file.name === name)) {
      return { ok: false, error: `分节「${name}」已存在` }
    }
    return saveSections([
      ...files.value,
      {
        name,
        vehicles: name.split('/').filter(Boolean),
        channels: speakers.map((speaker, index) => ({
          channel: `通道${index + 1}`,
          speaker,
        })),
      },
    ])
  }

  /** 按分节名替换一整个分节 */
  async function updateSection(name: string, next: SnapshotFile): Promise<SnapshotSaveResult> {
    if (!files.value.some((file) => file.name === name)) {
      return { ok: false, error: '该快照分节已不存在' }
    }
    if (name !== next.name && files.value.some((file) => file.name === next.name)) {
      return { ok: false, error: `分节「${next.name}」已存在` }
    }
    return saveSections(files.value.map((file) => (file.name === name ? next : file)))
  }

  /** 删除一个分节 */
  async function removeSection(name: string): Promise<SnapshotSaveResult> {
    if (!files.value.some((file) => file.name === name)) {
      return { ok: false, error: '该快照分节已不存在' }
    }
    return saveSections(files.value.filter((file) => file.name !== name))
  }

  return {
    ...data,
    files,
    hasData,
    fileCount,
    channelCount,
    saving,
    saveSections,
    addSection,
    updateSection,
    removeSection,
  }
})
