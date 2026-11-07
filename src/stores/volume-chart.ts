import type { VolumeTableRow } from '@/models'

export const VOLUME_LEVELS = Array.from({ length: 40 }, (_, index) => index)

/** 按 0–39 对齐一行音量；文件缺失的档位或空 dB 都显示为 - */
export function canonicalVolumeValues(row: VolumeTableRow, headerLevels: string[]): string[] {
  return VOLUME_LEVELS.map((level) => {
    const index = headerLevels.length
      ? headerLevels.findIndex((header) => Number(header) === level)
      : level
    const value = index >= 0 ? (row.values[index] ?? '') : ''
    return value.trim() || '-'
  })
}

export interface VolumeCurve {
  /** 共用同一条曲线的车型，以 / 合并 */
  label: string
  /** 0–39 对应的 dB；null 表示该段不绘制 */
  values: (number | null)[]
}

/** 一种音源下的车型曲线：数值完全相同的车型合并为一条 */
export function buildVolumeCurves(rows: VolumeTableRow[], headerLevels: string[]): VolumeCurve[] {
  const groups = new Map<string, VolumeCurve>()
  for (const row of rows) {
    const displayValues = canonicalVolumeValues(row, headerLevels)
    const values = displayValues.map((value) => {
      if (value === '-') return null
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    })
    const key = JSON.stringify(values)
    const existing = groups.get(key)
    if (existing) existing.label = `${existing.label}/${row.vehicle}`
    else groups.set(key, { label: row.vehicle, values })
  }
  return [...groups.values()]
}
