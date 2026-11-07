/** spec 文件清单条目 */
export interface SpecFileInfo {
  /** 绝对路径 */
  path: string
  /** 相对 specs 目录的展示名 */
  name: string
}

/** spec 文件内容 */
export interface SpecFileContent {
  path: string
  text: string
}

/** 列出 spec 文件的结果 */
export interface SpecsListOutcome {
  error?: string
  files?: SpecFileInfo[]
}

/** 读取 spec 文件的结果 */
export interface SpecsReadOutcome {
  error?: string
  file?: SpecFileContent
}

/** 保存 spec 文件后的摘要 */
export interface SpecsSavedState {
  filePath: string
  updatedAt: string
}

/** 写回 spec 文件的结果 */
export interface SpecsWriteOutcome {
  error?: string
  saved?: SpecsSavedState
}
