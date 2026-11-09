/** 快照里一个通道对应的扬声器 */
export interface SnapshotChannel {
  channel: string
  speaker: string
}

/** snapshot.ini 中的一个快照分节：[适用车型] + 逐行扬声器 */
export interface SnapshotFile {
  /** 分节名称，作为左侧快照名称 */
  name: string
  /** 分节名按 / 等分隔出的适用车型 */
  vehicles: string[]
  channels: SnapshotChannel[]
}

/** snapshot.ini 的读取结果 */
export interface SnapshotDocument {
  files: SnapshotFile[]
}

/** 读取扬声器快照数据的结果 */
export interface SnapshotLoadOutcome {
  error?: string
  unconfigured?: boolean
  document?: SnapshotDocument
}

/** 整份写回 snapshot.ini 的结果（新增 / 编辑 / 删除分节都走这一条） */
export interface SnapshotSaveOutcome {
  error?: string
  unconfigured?: boolean
  saved?: {
    filePath: string
    updatedAt: string
  }
}
