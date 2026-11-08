import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildGaugeRunArgs, parseGaugeArguments, readTasks, updateVehicleProperties, writeTasks } from '../tasks'
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

describe('buildGaugeRunArgs', () => {
  it('场景与运行车型分别转成 --scenario 与 --tags', () => {
    expect(buildGaugeRunArgs(['/specs/a.spec', '/specs/b.spec'], ['A', 'B'], 'HFAF')).toEqual([
      'run',
      '/specs/a.spec',
      '/specs/b.spec',
      '--scenario',
      'A',
      '--scenario',
      'B',
      '--tags',
      'HFAF',
    ])
  })

  it('未选车型时不添加 --tags', () => {
    expect(buildGaugeRunArgs(['/specs/a.spec'], ['A'], '')).toEqual([
      'run',
      '/specs/a.spec',
      '--scenario',
      'A',
    ])
  })
})

describe('parseGaugeArguments', () => {
  it('按空白拆分并保留引号内内容', () => {
    expect(parseGaugeArguments('--env default --name "hello world" --tag \'a b\'')).toEqual([
      '--env',
      'default',
      '--name',
      'hello world',
      '--tag',
      'a b',
    ])
    expect(parseGaugeArguments('')).toEqual([])
  })
})

describe('updateVehicleProperties', () => {
  it('创建或更新 value.properties 的 vehicle_model，并保留其他配置', () => {
    const project = temporaryProject()
    const created = updateVehicleProperties(project, 'default', 'SC6H')
    expect(created.note).toContain('vehicle_model=SC6H')

    writeFileSync(
      join(project, 'env', 'default', 'value.properties'),
      'demo_env = default\nvehicle_model = OLD\n',
      'utf8',
    )
    updateVehicleProperties(project, 'default', 'YU2')
    const text = readFileSync(join(project, 'env', 'default', 'value.properties'), 'utf8')
    expect(text).toContain('demo_env = default')
    expect(text).toContain('vehicle_model = YU2')
    expect(text).not.toContain('vehicle_model = OLD')
  })
})

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
