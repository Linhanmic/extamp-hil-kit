import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TaskRunOutcome, TaskScenario, TestTask } from '@/models'
import { useTasksStore } from './tasks'
import { configureVehicleAssets } from '../composables/vehicle-runtime'

export type QueueKind = 'task' | 'scenario' | 'spec'
export type QueueStatus = 'pending' | 'running' | 'success' | 'failed'

export interface QueueItem {
  id: string
  kind: QueueKind
  name: string
  scenarios: TaskScenario[]
  specPath?: string
  /** 运行时传给 Gauge --tags 的车型 */
  vehicle: string
  status: QueueStatus
  output: string
}

function outcomeText(outcome: TaskRunOutcome): string {
  const sections = [`$ ${outcome.command}`]
  if (outcome.stdout.trim()) sections.push(outcome.stdout.trimEnd())
  if (outcome.stderr.trim()) sections.push(`[stderr]\n${outcome.stderr.trimEnd()}`)
  if (outcome.error) sections.push(`[error] ${outcome.error}`)
  if (outcome.exitCode !== undefined) sections.push(`退出码：${outcome.exitCode}`)
  return sections.join('\n\n')
}

/**
 * 测试队列：当前应用会话内按顺序执行。
 * 执行中可继续入队，worker 会在当前项完成后接着取下一项。
 */
export const useQueueStore = defineStore('queue', () => {
  const tasksStore = useTasksStore()
  const items = ref<QueueItem[]>([])
  const running = ref(false)

  const pendingCount = computed(() => items.value.filter((item) => item.status === 'pending').length)
  const successCount = computed(() => items.value.filter((item) => item.status === 'success').length)
  const failedCount = computed(() => items.value.filter((item) => item.status === 'failed').length)

  function enqueueTask(task: TestTask, vehicle = '') {
    items.value.push({
      id: crypto.randomUUID(),
      kind: 'task',
      name: task.name,
      scenarios: task.scenarios.map((scenario) => ({ ...scenario })),
      vehicle,
      status: 'pending',
      output: '',
    })
  }

  function enqueueScenario(scenario: TaskScenario, vehicle = '') {
    items.value.push({
      id: crypto.randomUUID(),
      kind: 'scenario',
      name: scenario.heading,
      scenarios: [{ ...scenario }],
      vehicle,
      status: 'pending',
      output: '',
    })
  }

  function enqueueSpec(path: string, name: string, vehicle = '') {
    items.value.push({
      id: crypto.randomUUID(),
      kind: 'spec',
      name,
      scenarios: [],
      specPath: path,
      vehicle,
      status: 'pending',
      output: '',
    })
  }

  function remove(id: string) {
    const item = items.value.find((entry) => entry.id === id)
    if (item?.status === 'running') return
    items.value = items.value.filter((entry) => entry.id !== id)
  }

  function clearFinished() {
    items.value = items.value.filter((item) => item.status === 'pending' || item.status === 'running')
  }

  function move(id: string, offset: number) {
    const index = items.value.findIndex((item) => item.id === id)
    const target = index + offset
    if (index < 0 || target < 0 || target >= items.value.length) return
    if (items.value[index]!.status !== 'pending' || items.value[target]!.status !== 'pending') return
    const next = [...items.value]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item!)
    items.value = next
  }

  function showOutput(item: QueueItem) {
    tasksStore.output = item.output || '该项还没有运行输出'
  }

  /** 启动队列；运行中再次调用不会启动第二个 worker */
  async function start() {
    if (running.value) return
    const api = window.desktop?.tasks
    if (!api?.run || !api?.runSpec) {
      tasksStore.output = '队列执行只在桌面端可用'
      return
    }

    running.value = true
    try {
      while (true) {
        const item = items.value.find((entry) => entry.status === 'pending')
        if (!item) break
        item.status = 'running'
        tasksStore.output = `正在执行：${item.name}${item.vehicle ? `（车型 ${item.vehicle}）` : ''}`
        let configText = ''
        if (item.vehicle) {
          tasksStore.output = `正在自动配置车型 ${item.vehicle} 的测试资产…`
          const config = await configureVehicleAssets(item.vehicle)
          if (!config.ok) {
            item.status = 'failed'
            item.output = config.steps.concat(config.error ? `[error] ${config.error}` : []).join('\n\n')
            tasksStore.output = item.output
            continue
          }
          configText = config.steps.join('\n\n')
          tasksStore.output = configText
        }
        const outcome = item.kind === 'spec'
          ? await api.runSpec(item.specPath!, item.vehicle)
          : await api.run(item.scenarios, item.vehicle)
        item.output = [configText, outcomeText(outcome)].filter(Boolean).join('\n\n')
        item.status = outcome.exitCode === 0 && !outcome.error ? 'success' : 'failed'
        tasksStore.output = item.output
      }
    } finally {
      running.value = false
    }
  }

  function clear() {
    items.value = []
    running.value = false
  }

  return {
    items,
    running,
    pendingCount,
    successCount,
    failedCount,
    enqueueTask,
    enqueueScenario,
    enqueueSpec,
    remove,
    clearFinished,
    move,
    showOutput,
    start,
    clear,
  }
})
