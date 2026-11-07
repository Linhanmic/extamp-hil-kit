/** 出声位置的一次检查场景：标题 + 适用车型 + 检查步骤 + 出声扬声器 */
export interface OutputScenario {
  title: string
  vehicles: string[]
  steps: string[]
  speakers: string[]
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
