/** 一个音源场景及其 SLOT 通道 */
export interface SlotMappingScenario {
  title: string
  /** 场景原始步骤（不含 *），供生成 cpt 时保留 */
  steps: string[]
  slots: number[]
  /** 是否存在 sleep 等非 SLOT 步骤；没有 slots 时界面统一显示“-” */
  hasNonSlotSteps: boolean
}

/** 一个 SLOT 映射文件对应一种映射方案 */
export interface SlotMappingPlan {
  name: string
  filePath: string
  vehicles: string[]
  scenarios: SlotMappingScenario[]
  /** 单文件读取或解析失败，不影响目录下其他方案 */
  error?: string
}

/** SLOT 映射目录的解析结果 */
export interface SlotMappingDocument {
  plans: SlotMappingPlan[]
}

/** 读取 SLOT 映射数据的结果 */
export interface SlotMappingLoadOutcome {
  error?: string
  unconfigured?: boolean
  document?: SlotMappingDocument
}
