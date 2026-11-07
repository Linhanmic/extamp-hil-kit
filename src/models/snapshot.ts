/** 快照里一个通道对应的扬声器 */
export interface SnapshotChannel {
  channel: string
  speaker: string
}

/** 扬声器快照目录里的一个文件 */
export interface SnapshotFile {
  name: string
  channels: SnapshotChannel[]
}

/** 扬声器快照目录的读取结果（见「config/扬声器快照/」下的 txt 文件） */
export interface SnapshotDocument {
  files: SnapshotFile[]
}

/** 读取扬声器快照数据的结果 */
export interface SnapshotLoadOutcome {
  error?: string
  unconfigured?: boolean
  document?: SnapshotDocument
}
