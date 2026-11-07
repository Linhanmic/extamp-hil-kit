import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { SnapshotDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 扬声器快照数据：应用启动、切换项目时从项目设置指向的「扬声器快照目录」读回来，
 * 列出目录下所有快照文件与通道对应关系。只做展示，没有写回。加载骨架复用 useAsyncData。
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

  return { ...data, files, hasData, fileCount, channelCount }
})
