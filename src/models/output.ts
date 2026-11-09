/** 出声位置的一次检查场景 */
export interface OutputScenario {
  title: string
  /** 未写适用车型时为 true，表示适用全部车型 */
  allVehicles: boolean
  vehicles: string[]
  steps: string[]
  /** speak= 后引号内、按 | 分隔的出声扬声器关键字 */
  speakKeywords: string[]
  /** no_speak= 后引号内、按 | 分隔的不出声扬声器关键字 */
  noSpeakKeywords: string[]
}

/** 出声位置文件的解析结果（见「config/出声位置/出声位置.txt」） */
export interface OutputDocument {
  scenarios: OutputScenario[]
}

/** 读取出声位置数据的结果 */
export interface OutputLoadOutcome {
  error?: string
  unconfigured?: boolean
  document?: OutputDocument
}

/** 出声位置整份写回的结果 */
export interface OutputSaveOutcome {
  error?: string
  saved?: {
    filePath: string
    updatedAt: string
  }
}
