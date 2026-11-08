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
import { readSettings } from './settings-store'

/** 把设置里的附加参数拆成独立 argv，支持单双引号，不经过 shell */
export function parseGaugeArguments(text: string): string[] {
  const args: string[] = []
  for (const match of text.matchAll(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)) {
    const value = match[0]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      args.push(value.slice(1, -1))
    } else {
      args.push(value)
    }
  }
  return args
}

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

/** 组装 gauge run 参数；车型通过 --tags 传给 Gauge，实现按车型自动选用例 */
export function buildGaugeRunArgs(
  specPaths: string[],
  scenarioHeadings: string[] = [],
  tags = '',
): string[] {
  const args = ['run', ...specPaths]
  for (const heading of scenarioHeadings) args.push('--scenario', heading)
  if (tags.trim()) args.push('--tags', tags.trim())
  return args
}

function runGauge(
  projectPath: string,
  scenarios: TaskScenario[],
  tags = '',
): Promise<TaskRunOutcome> {
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
  const args = buildGaugeRunArgs(specPaths, scenarios.map((scenario) => scenario.heading), tags)
  return executeGauge(projectPath, args, tags)
}

/** 整份 spec 文件运行，不传 --scenario */
function runSpecGauge(
  projectPath: string,
  specPath: string,
  tags = '',
): Promise<TaskRunOutcome> {
  if (!insideSpecs(projectPath, specPath)) {
    return Promise.resolve({
      error: `规格书路径不在 specs 目录内：${specPath}`,
      command: '',
      stdout: '',
      stderr: '',
    })
  }
  return executeGauge(projectPath, buildGaugeRunArgs([specPath], [], tags), tags)
}

export interface VehiclePropertyResult {
  error?: string
  note?: string
}

/** 更新 env/<环境>/value.properties 中的 vehicle_model，保留文件其他配置 */
export function updateVehicleProperties(
  projectPath: string,
  envName: string,
  vehicle: string,
): VehiclePropertyResult {
  const name = vehicle.trim()
  if (!name) return {}
  const env = envName.trim() || 'default'
  const target = resolve(projectPath, 'env', env, 'value.properties')

  try {
    let text = ''
    try {
      text = readFileSync(target, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    const eol = text.includes('\r\n') ? '\r\n' : '\n'
    const lines = text.split(/\r?\n/)
    let replaced = false
    for (let index = 0; index < lines.length; index++) {
      if (/^\s*vehicle_model\s*=/.test(lines[index]!)) {
        lines[index] = `vehicle_model = ${name}`
        replaced = true
        break
      }
    }
    if (!replaced) {
      if (text.trim()) lines.push('', `vehicle_model = ${name}`)
      else lines.push(`vehicle_model = ${name}`)
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, lines.join(eol).replace(/\n{3,}/g, `${eol}${eol}`), 'utf8')
    return { note: `value.properties：${target} vehicle_model=${name}` }
  } catch (error) {
    return { error: `value.properties 更新失败（${target}）：${message(error)}` }
  }
}

function executeGauge(
  projectPath: string,
  args: string[],
  vehicle = '',
): Promise<TaskRunOutcome> {
  const notes: string[] = []
  if (vehicle.trim()) {
    const settings = readSettings(projectPath).document?.settings
    const property = updateVehicleProperties(projectPath, settings?.gaugeEnv ?? '', vehicle)
    if (property.error) {
      return Promise.resolve({
        error: property.error,
        command: '',
        stdout: '',
        stderr: '',
        notes,
      })
    }
    if (property.note) notes.push(property.note)
  }

  const settings = readSettings(projectPath).document?.settings
  const extraArgs = parseGaugeArguments(settings?.gaugeArgs ?? '')
  const finalArgs = [args[0]!, ...extraArgs, ...args.slice(1)]
  const command = `gauge ${finalArgs.map((arg) => JSON.stringify(arg)).join(' ')}`
  const executable =
    settings?.gaugeExecutable || (process.platform === 'win32' ? 'gauge.exe' : 'gauge')

  return new Promise((resolveOutcome) => {
    const child = spawn(executable, finalArgs, {
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
      resolveOutcome({ ...outcome, notes })
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

  handle('tasks:run', async (_event, scenarios: TaskScenario[], tags?: string) => {
    const project = readWorkspace().current
    if (!project) {
      return { error: '还没有绑定 Gauge 项目', command: '', stdout: '', stderr: '' }
    }
    if (!Array.isArray(scenarios) || !scenarios.length) {
      return { error: '请先选择要运行的场景', command: '', stdout: '', stderr: '' }
    }
    return runGauge(project.path, scenarios, typeof tags === 'string' ? tags : '')
  })

  handle('tasks:run-spec', async (_event, specPath: string, tags?: string) => {
    const project = readWorkspace().current
    if (!project) {
      return { error: '还没有绑定 Gauge 项目', command: '', stdout: '', stderr: '' }
    }
    return runSpecGauge(project.path, specPath, typeof tags === 'string' ? tags : '')
  })
}
