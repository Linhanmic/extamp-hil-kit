import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { TaskRunOutcome, TaskScenario, TestTask } from '@/models'

/**
 * 新建任务：任务保存在 .hil-kit/tasks.json，运行通过主进程调用 Gauge CLI。
 * output 同时供新建任务页和底部终端面板展示。
 */
export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<TestTask[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const running = ref(false)
  const error = ref('')
  const output = ref('选择场景后点击「运行选中场景」，Gauge 输出会显示在这里。')

  const hasTasks = computed(() => tasks.value.length > 0)

  async function load() {
    const api = window.desktop?.tasks
    if (!api?.load) return
    loading.value = true
    error.value = ''
    try {
      const outcome = await api.load()
      tasks.value = outcome.document?.tasks ?? []
      if (outcome.error) error.value = outcome.error
    } finally {
      loading.value = false
    }
  }

  function clear() {
    tasks.value = []
    error.value = ''
    output.value = '选择场景后点击「运行选中场景」，Gauge 输出会显示在这里。'
  }

  async function saveTask(name: string, scenarios: TaskScenario[], id = '') {
    const api = window.desktop?.tasks
    const taskName = name.trim()
    if (!taskName) return { ok: false as const, error: '任务名称不能为空' }
    if (!scenarios.length) return { ok: false as const, error: '请先选择要运行的场景' }
    if (!api?.save) return { ok: false as const, error: '任务只在桌面端可保存' }

    const existing = tasks.value.find((task) => task.id === id)
    const next: TestTask = {
      id: id || crypto.randomUUID(),
      name: taskName,
      scenarios: scenarios.map((scenario) => ({ ...scenario })),
      createdAt: existing?.createdAt ?? '',
      updatedAt: '',
    }
    const nextTasks = existing
      ? tasks.value.map((task) => (task.id === id ? next : task))
      : [...tasks.value, next]

    saving.value = true
    try {
      const outcome = await api.save(nextTasks)
      if (!outcome.saved) return { ok: false as const, error: outcome.error ?? '保存任务失败' }
      await load()
      return { ok: true as const, id: next.id }
    } finally {
      saving.value = false
    }
  }

  async function run(scenarios: TaskScenario[]) {
    const api = window.desktop?.tasks
    if (!api?.run) return { ok: false as const, error: '运行只在桌面端可用' }
    return execute(() => api.run(scenarios))
  }

  async function runSpec(path: string) {
    const api = window.desktop?.tasks
    if (!api?.runSpec) return { ok: false as const, error: '运行只在桌面端可用' }
    return execute(() => api.runSpec(path))
  }

  async function execute(call: () => Promise<TaskRunOutcome>) {
    running.value = true
    output.value = '正在运行 Gauge 场景…'
    try {
      const outcome = await call()
      const sections = [`$ ${outcome.command}`]
      if (outcome.stdout.trim()) sections.push(outcome.stdout.trimEnd())
      if (outcome.stderr.trim()) sections.push(`[stderr]\n${outcome.stderr.trimEnd()}`)
      if (outcome.error) sections.push(`[error] ${outcome.error}`)
      if (outcome.exitCode !== undefined) sections.push(`退出码：${outcome.exitCode}`)
      output.value = sections.join('\n\n')
      return outcome.exitCode === 0 && !outcome.error
        ? { ok: true as const }
        : { ok: false as const, error: outcome.error ?? `Gauge 退出码 ${outcome.exitCode ?? '未知'}` }
    } finally {
      running.value = false
    }
  }

  return {
    tasks,
    loading,
    saving,
    running,
    error,
    output,
    hasTasks,
    load,
    clear,
    saveTask,
    run,
    runSpec,
  }
})
