import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { VolumeTableDocument, VolumeTableRow } from '@/models'
import { useAsyncData } from '@/composables/useAsyncData'

export type MeterSaveResult = { ok: true } | { ok: false; error: string }

/**
 * 音量表数据：应用启动、切换项目时从项目设置指向的「音量表文件」读回来。
 * 行支持新增 / 编辑 / 删除，整份写回后重新读取；加载骨架复用 useAsyncData。
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

  async function persist(nextRows: VolumeTableRow[]): Promise<MeterSaveResult> {
    const api = window.desktop?.meter
    if (!api?.save) return { ok: false, error: '音量表只在桌面端可编辑' }

    saving.value = true
    try {
      // IPC 用结构化克隆传参，Vue 的响应式代理不能被克隆；先换成落盘的普通对象
      const payload = JSON.parse(
        JSON.stringify({ levels: levels.value, rows: nextRows }),
      ) as VolumeTableDocument
      const outcome = await api.save(payload)
      if (outcome.saved) {
        await data.load()
        return { ok: true }
      }
      return { ok: false, error: outcome.error ?? '保存音量表失败' }
    } finally {
      saving.value = false
    }
  }

  /** 新增或按原行替换 */
  async function saveRow(original: VolumeTableRow | null, next: VolumeTableRow): Promise<MeterSaveResult> {
    const vehicle = next.vehicle.trim()
    const source = next.source.trim()
    if (!vehicle || !source) return { ok: false, error: '车型与音源类型不能为空' }
    const duplicate = rows.value.some(
      (row) => row !== original && row.vehicle === vehicle && row.source === source,
    )
    if (duplicate) return { ok: false, error: `「${vehicle} · ${source}」已存在` }

    const nextRows = rows.value.map((row) => ({ ...row, values: [...row.values] }))
    const nextRow = { vehicle, source, values: next.values.map((value) => value.trim()) }
    if (original) {
      const index = nextRows.indexOf(original)
      if (index < 0) return { ok: false, error: '原音量行不存在，请刷新后重试' }
      nextRows[index] = nextRow
    } else {
      nextRows.push(nextRow)
    }
    return persist(nextRows)
  }

  /** 删除一行音量记录 */
  async function deleteRow(row: VolumeTableRow): Promise<MeterSaveResult> {
    const target = rows.value.find(
      (item) => item.vehicle === row.vehicle && item.source === row.source,
    )
    if (!target) return { ok: false, error: '该音量行已不存在' }
    return persist(
      rows.value.filter((item) => !(item.vehicle === row.vehicle && item.source === row.source)),
    )
  }

  return {
    ...data,
    levels,
    rows,
    hasData,
    rowCount,
    vehicleCount,
    saving,
    saveRow,
    deleteRow,
  }
})
