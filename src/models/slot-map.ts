/** SLOT 映射里一款车型的对应关系 */
export interface SlotMappingEntry {
  vehicle: string
  /** 解析后的 slot 文件绝对路径，界面展示用 */
  filePath: string
  /** slot 文件逐行内容；文件缺失时为空并置 missing */
  lines: string[]
  missing?: boolean
}

/** SLOT 映射文件的解析结果（见「config/SLOT映射/mapping.ini」及其指向的 slot 文件） */
export interface SlotMappingDocument {
  entries: SlotMappingEntry[]
}

/** 读取 SLOT 映射数据的结果 */
export interface SlotMappingLoadOutcome {
  error?: string
  unconfigured?: boolean
  document?: SlotMappingDocument
}
