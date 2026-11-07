/** 封装文件清单条目 */
export interface ConceptFileInfo {
  /** 绝对路径 */
  path: string
  /** 相对 concepts 目录的展示名 */
  name: string
}

/** 封装文件内容 */
export interface ConceptFileContent {
  path: string
  name: string
  text: string
}

/** 列出封装文件的结果 */
export interface ConceptsListOutcome {
  error?: string
  files?: ConceptFileInfo[]
}

/** 读取封装文件的结果 */
export interface ConceptsReadOutcome {
  error?: string
  file?: ConceptFileContent
}

/** 保存封装文件后的摘要 */
export interface ConceptsSavedState {
  filePath: string
  updatedAt: string
}

/** 写回封装文件的结果 */
export interface ConceptsWriteOutcome {
  error?: string
  saved?: ConceptsSavedState
}

/** 删除封装文件的结果 */
export interface ConceptsDeleteOutcome {
  error?: string
  deleted?: boolean
}
