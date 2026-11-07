/** 音量表的一行：车型 + 音源 + 各音量档位的数值 */
export interface VolumeTableRow {
  vehicle: string
  source: string
  values: string[]
}

/** 音量表文件的解析结果（见「config/音量表/test.csv」） */
export interface VolumeTableDocument {
  levels: string[]
  rows: VolumeTableRow[]
}

/** 读取音量表数据的结果 */
export interface VolumeTableLoadOutcome {
  error?: string
  unconfigured?: boolean
  document?: VolumeTableDocument
}
