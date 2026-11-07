/**
 * 封装文件（主进程侧）：列出、读取、写回与删除 Gauge 项目的 specs 目录下的 .cpt 文件。
 *
 * 封装（Gauge 概念）的解析与生成在渲染层（src/spec/concept-file.ts），主进程只做文件读写。
 * 读写 / 删除前校验目标路径确实在 <项目>/specs 之内，避免越界操作。
 */
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { ipcMain } from 'electron'
import type {
  ConceptFileContent,
  ConceptFileInfo,
  ConceptsDeleteOutcome,
  ConceptsListOutcome,
  ConceptsReadOutcome,
  ConceptsSavedState,
  ConceptsWriteOutcome,
} from '../src/models'
import { readWorkspace } from './workspace'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 项目 specs 目录（.cpt 与 .spec 同目录维护） */
function conceptsDir(projectPath: string): string {
  return resolve(projectPath, 'specs')
}

/** 目标路径是否落在项目 specs 目录内（读写前的越界防护）；相对路径相对 specs 目录解析 */
function isInsideConceptsDir(projectPath: string, target: string): boolean {
  const base = conceptsDir(projectPath)
  const resolved = isAbsolute(target) ? resolve(target) : resolve(base, target)
  return resolved === base || resolved.startsWith(base + sep)
}

/** 归一成绝对路径：相对名（如 audio.cpt）落在 specs 目录下 */
function resolveConceptPath(projectPath: string, target: string): string {
  return isAbsolute(target) ? resolve(target) : resolve(conceptsDir(projectPath), target)
}

/** 递归收集 specs 目录下的 .cpt 文件 */
function listConceptFiles(dir: string): string[] {
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
      result.push(...listConceptFiles(full))
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.cpt')) {
      result.push(full)
    }
  }
  return result
}

export function registerConceptsIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('concepts:list', () => {
    const project = readWorkspace().current
    // 没绑定项目或还没有 specs，都按「没有封装」处理
    if (!project) return { files: [] } satisfies ConceptsListOutcome
    try {
      const dir = conceptsDir(project.path)
      const files = listConceptFiles(dir).map(
        (path): ConceptFileInfo => ({ path, name: relative(dir, path).split(sep).join('/') }),
      )
      return { files } satisfies ConceptsListOutcome
    } catch (error) {
      return { error: `封装目录无法读取：${errorMessage(error)}` } satisfies ConceptsListOutcome
    }
  })

  handle('concepts:read', (_event, path: string) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目' } satisfies ConceptsReadOutcome
    if (typeof path !== 'string' || !isInsideConceptsDir(project.path, path)) {
      return { error: '封装文件路径不在项目 specs 目录内' } satisfies ConceptsReadOutcome
    }
    const target = resolveConceptPath(project.path, path)
    try {
      return {
        file: {
          path: target,
          name: relative(conceptsDir(project.path), target).split(sep).join('/'),
          text: readFileSync(target, 'utf8'),
        } satisfies ConceptFileContent,
      } satisfies ConceptsReadOutcome
    } catch (error) {
      return { error: `封装文件无法读取：${errorMessage(error)}` } satisfies ConceptsReadOutcome
    }
  })

  handle('concepts:write', (_event, path: string, text: string) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目' } satisfies ConceptsWriteOutcome
    if (typeof path !== 'string' || !isInsideConceptsDir(project.path, path)) {
      return { error: '封装文件路径不在项目 specs 目录内' } satisfies ConceptsWriteOutcome
    }
    if (typeof text !== 'string') return { error: '封装内容不正确' } satisfies ConceptsWriteOutcome
    const target = resolveConceptPath(project.path, path)
    try {
      mkdirSync(resolve(target, '..'), { recursive: true })
      writeFileSync(target, text, 'utf8')
      return {
        saved: {
          filePath: target,
          updatedAt: statSync(target).mtime.toISOString(),
        } satisfies ConceptsSavedState,
      } satisfies ConceptsWriteOutcome
    } catch (error) {
      return { error: `封装文件无法写入：${errorMessage(error)}` } satisfies ConceptsWriteOutcome
    }
  })

  handle('concepts:delete', (_event, path: string) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目' } satisfies ConceptsDeleteOutcome
    if (typeof path !== 'string' || !isInsideConceptsDir(project.path, path)) {
      return { error: '封装文件路径不在项目 specs 目录内' } satisfies ConceptsDeleteOutcome
    }
    const target = resolveConceptPath(project.path, path)
    try {
      unlinkSync(target)
      return { deleted: true } satisfies ConceptsDeleteOutcome
    } catch (error) {
      return { error: `封装文件无法删除：${errorMessage(error)}` } satisfies ConceptsDeleteOutcome
    }
  })
}
