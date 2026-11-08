import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readTasks, writeTasks } from '../tasks'
import type { TestTask } from '../../src/models'

const temporaryDirs: string[] = []

function temporaryProject() {
  const dir = mkdtempSync(join(tmpdir(), 'hil-tasks-'))
  temporaryDirs.push(dir)
  return dir
}

afterEach(() => {
  while (temporaryDirs.length)
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true })
})

function task(overrides: Partial<TestTask> = {}): TestTask {
  return {
    id: 'task-1',
    name: '媒体音回归',
    scenarios: [{ path: join('specs', 'media.spec'), heading: '播放媒体音' }],
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

describe('tasks.json', () => {
  it('保存并读回任务，文件缺失按空处理', () => {
    const project = temporaryProject()
    expect(readTasks(project).empty).toBe(true)

    const outcome = writeTasks(project, [task()])
    expect(outcome.saved).toBeDefined()

    const loaded = readTasks(project).document
    expect(loaded?.tasks).toHaveLength(1)
    expect(loaded?.tasks[0]).toMatchObject({ id: 'task-1', name: '媒体音回归' })
    expect(loaded?.createdAt).toBeTruthy()
    expect(loaded?.updatedAt).toBeTruthy()
  })

  it('拒绝重复名称、空场景和 specs 外路径', () => {
    const project = temporaryProject()

    expect(writeTasks(project, [task(), task({ id: 'task-2' })]).error).toMatch(/重复/)
    expect(writeTasks(project, [task({ scenarios: [] })]).error).toMatch(/还没有选择场景/)
    expect(
      writeTasks(project, [task({ scenarios: [{ path: join(project, 'outside', 'x.spec'), heading: 'x' }] })]).error,
    ).toMatch(/不在 specs/)
  })
})
