import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { SnapshotDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 扬声器快照数据：应用启动、切换项目时从项目设置指向的目录读取统一的 `snapshot.ini`，
 * 每个车型分节作为一组快照，展示适用车型与通道对应关系；支持追加新分节并读回。
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

  async function addSnapshot(section: string, speakers: string[]) {
    const api = window.desktop?.snapshot
    if (!api?.append) return { ok: false as const, error: '新增快照只在桌面端可用' }

    saving.value = true
    try {
      const outcome = await api.append(section, speakers)
      if (outcome.saved) {
        await data.load()
        return { ok: true as const }
      }
      return { ok: false as const, error: outcome.error ?? '新增快照失败' }
    } finally {
      saving.value = false
    }
  }

  return { ...data, files, hasData, fileCount, channelCount, saving, addSnapshot }
})
