/**
 * spec 文件（主进程侧）：列出、读取与写回 Gauge 项目的 specs 目录下的 .spec 文件。
 *
 * spec 文件是 Gauge 测试源码，更新场景标签属于「读 → 改 → 写」：渲染层负责解析与算标签，
 * 主进程只做文件读写。写回前校验目标路径确实在 <项目>/specs 之内，避免越界写入。
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { ipcMain } from 'electron'
import type {
  SpecFileContent,
  SpecFileInfo,
  SpecsListOutcome,
  SpecsReadOutcome,
  SpecsSavedState,
  SpecsWriteOutcome,
} from '../src/models'
import { readWorkspace } from './workspace'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 项目 specs 目录 */
function specsDir(projectPath: string): string {
  return resolve(projectPath, 'specs')
}

/** 目标路径是否落在项目 specs 目录内（读写前的越界防护） */
function isInsideSpecsDir(projectPath: string, target: string): boolean {
  const base = specsDir(projectPath)
  const resolved = isAbsolute(target) ? resolve(target) : resolve(projectPath, target)
  return resolved === base || resolved.startsWith(base + sep)
}

/** 递归收集 specs 目录下的 .spec 文件 */
function listSpecFiles(dir: string): string[] {
  const result: string[] = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      result.push(...listSpecFiles(full))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.spec')) {
      result.push(full)
    }
  }
  return result
}

export function registerSpecsIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('specs:list', () => {
    const project = readWorkspace().current
    // 没绑定项目或还没有 specs，都按「没有 spec」处理
    if (!project) return { files: [] } satisfies SpecsListOutcome
    try {
      const dir = specsDir(project.path)
      const files = listSpecFiles(dir).map(
        (path): SpecFileInfo => ({ path, name: relative(dir, path).split(sep).join('/') }),
      )
      return { files } satisfies SpecsListOutcome
    } catch (error) {
      return { error: `spec 目录无法读取：${errorMessage(error)}` } satisfies SpecsListOutcome
    }
  })

  handle('specs:read', (_event, path: string) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目' } satisfies SpecsReadOutcome
    if (typeof path !== 'string' || !isInsideSpecsDir(project.path, path)) {
      return { error: 'spec 文件路径不在项目 specs 目录内' } satisfies SpecsReadOutcome
    }
    try {
      return {
        file: { path, text: readFileSync(path, 'utf8') } satisfies SpecFileContent,
      } satisfies SpecsReadOutcome
    } catch (error) {
      return { error: `spec 文件无法读取：${errorMessage(error)}` } satisfies SpecsReadOutcome
    }
  })

  handle('specs:write', (_event, path: string, text: string) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目' } satisfies SpecsWriteOutcome
    if (typeof path !== 'string' || !isInsideSpecsDir(project.path, path)) {
      return { error: 'spec 文件路径不在项目 specs 目录内' } satisfies SpecsWriteOutcome
    }
    if (typeof text !== 'string') return { error: 'spec 内容不正确' } satisfies SpecsWriteOutcome
    try {
      mkdirSync(resolve(path, '..'), { recursive: true })
      writeFileSync(path, text, 'utf8')
      return {
        saved: {
          filePath: path,
          updatedAt: statSync(path).mtime.toISOString(),
        } satisfies SpecsSavedState,
      } satisfies SpecsWriteOutcome
    } catch (error) {
      return { error: `spec 文件无法写入：${errorMessage(error)}` } satisfies SpecsWriteOutcome
    }
  })
}
