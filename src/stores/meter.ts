import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { VolumeTableDocument, VolumeTableRow } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

/**
 * 音量表数据：应用启动、切换项目时从项目设置指向的「音量表文件」读回来。
 * 支持新增与编辑行，整份写回后重新读取；加载骨架复用 useAsyncData。
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
  const saving = ref(false)

  /** 新增或按原行替换，整份写回后重新读取 */
  async function saveRow(original: VolumeTableRow | null, next: VolumeTableRow) {
    const vehicle = next.vehicle.trim()
    const source = next.source.trim()
    if (!vehicle || !source) return { ok: false as const, error: '车型与音源类型不能为空' }
    const duplicate = rows.value.some(
      (row) => row !== original && row.vehicle === vehicle && row.source === source,
    )
    if (duplicate) return { ok: false as const, error: `「${vehicle} · ${source}」已存在` }

    const api = window.desktop?.meter
    if (!api?.save) return { ok: false as const, error: '音量表只在桌面端可编辑' }

    const nextRows = rows.value.map((row) => ({ ...row, values: [...row.values] }))
    const nextRow = { vehicle, source, values: next.values.map((value) => value.trim()) }
    if (original) {
      const index = nextRows.indexOf(original)
      if (index < 0) return { ok: false as const, error: '原音量行不存在，请刷新后重试' }
      nextRows[index] = nextRow
    } else {
      nextRows.push(nextRow)
    }

    saving.value = true
    try {
      const outcome = await api.save({ levels: data.document.value?.levels ?? [], rows: nextRows })
      if (outcome.saved) {
        await data.load()
        return { ok: true as const }
      }
      return { ok: false as const, error: outcome.error ?? '保存音量表失败' }
    } finally {
      saving.value = false
    }
  }

  return { ...data, levels, rows, hasData, rowCount, vehicleCount, saving, saveRow }
})
