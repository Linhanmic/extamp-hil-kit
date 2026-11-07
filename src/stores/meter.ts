import { computed } from 'vue'
import { defineStore } from 'pinia'
import type { VolumeTableDocument } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 音量表数据：应用启动、切换项目时从项目设置指向的「音量表文件」读回来。
 * 只做展示，没有写回。加载骨架复用 useAsyncData。
 */
export const useMeterStore = defineStore('meter', () => {
  const data = useAsyncData<VolumeTableDocument>(
    () => window.desktop?.meter?.load?.(),
    '读取音量表失败',
  )

  const levels = computed(() => data.document.value?.levels ?? [])
  const rows = computed(() => data.document.value?.rows ?? [])
  const hasData = computed(() => rows.value.length > 0)
  const rowCount = computed(() => rows.value.length)
  const vehicleCount = computed(() => new Set(rows.value.map((row) => row.vehicle)).size)

  return { ...data, levels, rows, hasData, rowCount, vehicleCount }
})
