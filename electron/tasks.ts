/** 任务的落盘与 Gauge 执行：任务保存在 .hil-kit/tasks.json，执行通过 Gauge CLI */
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, resolve, sep } from 'node:path'
import { ipcMain } from 'electron'
import type {
  TaskRunOutcome,
  TaskScenario,
  TasksDocument,
  TasksLoadOutcome,
  TasksSaveOutcome,
  TestTask,
} from '../src/models'
import { readWorkspace } from './workspace'

const TASKS_FILE = '.hil-kit/tasks.json'
const SCHEMA_VERSION = 1

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function tasksFilePath(projectPath: string): string {
  return resolve(projectPath, TASKS_FILE)
}

function insideSpecs(projectPath: string, target: string): boolean {
  const base = resolve(projectPath, 'specs')
  const resolved = isAbsolute(target) ? resolve(target) : resolve(base, target)
  return resolved.startsWith(base + sep)
}

export function readTasks(projectPath: string): TasksLoadOutcome {
  const target = tasksFilePath(projectPath)
  try {
    const raw = JSON.parse(readFileSync(target, 'utf8')) as Partial<TasksDocument>
    if (raw.schemaVersion !== SCHEMA_VERSION || !Array.isArray(raw.tasks)) {
      return { error: `任务文件结构不正确（${target}）` }
    }
    return {
      document: {
        schemaVersion: SCHEMA_VERSION,
        createdAt: raw.createdAt ?? '',
        updatedAt: raw.updatedAt ?? '',
        tasks: raw.tasks as TestTask[],
      },
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { empty: true }
    return { error: `任务文件无法读取（${target}）：${message(error)}` }
  }
}

export function writeTasks(projectPath: string, tasks: TestTask[]): TasksSaveOutcome {
  const names = new Set<string>()
  for (const task of tasks) {
    const name = task.name.trim()
    if (!name) return { error: '任务名称不能为空' }
    if (names.has(name)) return { error: `任务名称「${name}」重复` }
    names.add(name)
    if (!task.scenarios.length) return { error: `任务「${name}」还没有选择场景` }
    for (const scenario of task.scenarios) {
      if (!insideSpecs(projectPath, scenario.path)) {
        return { error: `场景路径不在 specs 目录内：${scenario.path}` }
      }
      if (!scenario.heading.trim()) return { error: `任务「${name}」存在空场景标题` }
    }
  }

  const target = tasksFilePath(projectPath)
  const existing = readTasks(projectPath).document
  const previousById = new Map((existing?.tasks ?? []).map((task) => [task.id, task]))
  const now = new Date().toISOString()
  const nextTasks = tasks.map((task) => {
    const previous = previousById.get(task.id)
    return {
      ...task,
      id: task.id || randomUUID(),
      name: task.name.trim(),
      createdAt: previous?.createdAt ?? task.createdAt ?? now,
      updatedAt: now,
    }
  })
  const document: TasksDocument = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    tasks: nextTasks,
  }

  try {
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, JSON.stringify(document, null, 2), 'utf8')
    return { saved: { filePath: target, updatedAt: now } }
  } catch (error) {
    return { error: `任务保存失败（${target}）：${message(error)}` }
  }
}

function runGauge(projectPath: string, scenarios: TaskScenario[]): Promise<TaskRunOutcome> {
  for (const scenario of scenarios) {
    if (!insideSpecs(projectPath, scenario.path)) {
      return Promise.resolve({
        error: `场景路径不在 specs 目录内：${scenario.path}`,
        command: '',
        stdout: '',
        stderr: '',
      })
    }
  }

  const specPaths = [...new Set(scenarios.map((scenario) => scenario.path))]
  const args = ['run', ...specPaths]
  for (const scenario of scenarios) args.push('--scenario', scenario.heading)
  return executeGauge(projectPath, args)
}

/** 整份 spec 文件运行，不传 --scenario */
function runSpecGauge(projectPath: string, specPath: string): Promise<TaskRunOutcome> {
  if (!insideSpecs(projectPath, specPath)) {
    return Promise.resolve({
      error: `规格书路径不在 specs 目录内：${specPath}`,
      command: '',
      stdout: '',
      stderr: '',
    })
  }
  return executeGauge(projectPath, ['run', specPath])
}

function executeGauge(projectPath: string, args: string[]): Promise<TaskRunOutcome> {
  const command = `gauge ${args.map((arg) => JSON.stringify(arg)).join(' ')}`
  const executable = process.platform === 'win32' ? 'gauge.exe' : 'gauge'

  return new Promise((resolveOutcome) => {
    const child = spawn(executable, args, {
      cwd: projectPath,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (outcome: TaskRunOutcome) => {
      if (settled) return
      settled = true
      resolveOutcome(outcome)
    }

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', (error) => {
      finish({ error: `Gauge 启动失败：${message(error)}`, command, stdout, stderr })
    })
    child.on('close', (exitCode) => {
      finish({ command, stdout, stderr, exitCode: exitCode ?? undefined })
    })
  })
}

export function registerTasksIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('tasks:load', () => {
    const project = readWorkspace().current
    if (!project) return { empty: true } satisfies TasksLoadOutcome
    return readTasks(project.path)
  })

  handle('tasks:save', (_event, tasks: TestTask[]) => {
    const project = readWorkspace().current
    if (!project) return { error: '还没有绑定 Gauge 项目' } satisfies TasksSaveOutcome
    return writeTasks(project.path, tasks)
  })

  handle('tasks:run', async (_event, scenarios: TaskScenario[]) => {
    const project = readWorkspace().current
    if (!project) {
      return { error: '还没有绑定 Gauge 项目', command: '', stdout: '', stderr: '' }
    }
    if (!Array.isArray(scenarios) || !scenarios.length) {
      return { error: '请先选择要运行的场景', command: '', stdout: '', stderr: '' }
    }
    return runGauge(project.path, scenarios)
  })

  handle('tasks:run-spec', async (_event, specPath: string) => {
    const project = readWorkspace().current
    if (!project) {
      return { error: '还没有绑定 Gauge 项目', command: '', stdout: '', stderr: '' }
    }
    return runSpecGauge(project.path, specPath)
  })
}
