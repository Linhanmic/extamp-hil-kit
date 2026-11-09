/**
 * 扬声器快照（snapshot.ini）的生成：由分节写回 INI 文本。
 *
 * 格式与读取侧（electron/business-store.ts 的 parseSnapshotIniText）一致：
 *   `[适用车型]` 是分节名（多车型用 `/` 分隔），其后每行一个扬声器，行序即通道号。
 * 分节之间空一行。分节名里不允许出现 `[`、`]` 与换行。
 */
import type { SnapshotFile } from '@/models/snapshot'

/** 分节名：优先用车名字段回写的原始名，否则按车型拼接 */
export function snapshotSectionName(file: Pick<SnapshotFile, 'name' | 'vehicles'>): string {
  return file.name.trim() || file.vehicles.join('/')
}

export function serializeSnapshotSections(files: SnapshotFile[]): string {
  const blocks: string[] = []
  for (const file of files) {
    const name = snapshotSectionName(file)
    if (!name) continue
    const lines = [`[${name}]`]
    for (const channel of file.channels) {
      const speaker = channel.speaker.trim()
      if (speaker) lines.push(speaker)
    }
    blocks.push(lines.join('\n'))
  }
  return blocks.length ? `${blocks.join('\n\n')}\n` : ''
}
