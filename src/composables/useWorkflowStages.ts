import { computed } from 'vue'
import { useConceptsStore } from '@/stores/concepts'
import { useConfigsStore } from '@/stores/configs'
import { useOutputStore } from '@/stores/output'
import { useQueueStore } from '@/stores/queue'
import { useRequirementsStore } from '@/stores/requirements'
import { useSettingsStore } from '@/stores/settings'
import { useSlotMapStore } from '@/stores/slotMap'
import { useSpecsStore } from '@/stores/specs'
import { useTasksStore } from '@/stores/tasks'

/** 阶段状态：未开始 / 就绪 / 待处理（可继续但有提醒）/ 异常 / 执行中 */
export type WorkflowStageStatus = 'idle' | 'ready' | 'warning' | 'error' | 'running'

export interface WorkflowStage {
  key: string
  /** 阶段名，与 docs/hil-run-guide.md 的运行前流程一致 */
  title: string
  status: WorkflowStageStatus
  /** 状态标签文本 */
  statusLabel: string
  /** 一行摘要：条数、文件、环境等 */
  detail: string
  /** 点击跳转的路由名 */
  routeName: string
}

const STATUS_LABELS: Record<WorkflowStageStatus, string> = {
  idle: '未开始',
  ready: '就绪',
  warning: '待处理',
  error: '异常',
  running: '执行中',
}

/** 把设置里的生成目标路径归一成相对 specs 目录的文件名，供封装列表比对 */
function specsRelative(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '')
  const nested = normalized.lastIndexOf('/specs/')
  if (nested >= 0) return normalized.slice(nested + '/specs/'.length)
  if (normalized.startsWith('specs/')) return normalized.slice('specs/'.length)
  return normalized
}

function stage(
  key: string,
  title: string,
  routeName: string,
  status: WorkflowStageStatus,
  detail: string,
): WorkflowStage {
  return { key, title, routeName, status, statusLabel: STATUS_LABELS[status], detail }
}

/**
 * 运行前全流程：需求导入 → 配置参数 → 车型标签 → 出声位置目标 CPT →
 * SLOT 映射目标 CPT → 运行环境 → Gauge 执行。
 *
 * 每一步的状态都由对应领域 store 的只读状态推出来，不额外落盘：
 * 所以页面上一有改动，右栏这里跟着变。阶段顺序与 docs/hil-run-guide.md 一致。
 */
export function useWorkflowStages() {
  const settingsStore = useSettingsStore()
  const requirementsStore = useRequirementsStore()
  const configsStore = useConfigsStore()
  const specsStore = useSpecsStore()
  const outputStore = useOutputStore()
  const slotMapStore = useSlotMapStore()
  const conceptsStore = useConceptsStore()
  const queueStore = useQueueStore()
  const tasksStore = useTasksStore()

  /** 目标 CPT 是否已经按设置路径生成过 */
  function generatedTarget(configuredPath: string): { exists: boolean; name: string } {
    const name = specsRelative(configuredPath)
    const exists = conceptsStore.files.some((file) => file.name === name)
    return { exists, name }
  }

  const stages = computed<WorkflowStage[]>(() => {
    const settings = settingsStore.settings

    // 1. 需求导入
    const requirementsStage = requirementsStore.error
      ? stage('requirements', '需求导入', 'requirement', 'error', requirementsStore.error)
      : requirementsStore.requirementCount > 0
        ? stage(
            'requirements',
            '需求导入',
            'requirement',
            'ready',
            `${requirementsStore.requirementCount} 条需求 · ${requirementsStore.variantCount} 个变体`,
          )
        : stage('requirements', '需求导入', 'requirement', 'idle', '还没导入需求分析表')

    // 2. 配置参数
    const errorConfigs = configsStore.rows.filter((row) => row.status === 'error').length
    const floatingConfigs = configsStore.rows.filter((row) => row.status === 'floating').length
    const configsStage = configsStore.error
      ? stage('configs', '配置参数', 'config', 'error', configsStore.error)
      : errorConfigs > 0
        ? stage(
            'configs',
            '配置参数',
            'config',
            'error',
            `${errorConfigs} 个配置项存在失效引用`,
          )
        : floatingConfigs > 0
          ? stage('configs', '配置参数', 'config', 'warning', `${floatingConfigs} 个配置项浮空`)
          : configsStore.configurationCount > 0
            ? stage(
                'configs',
                '配置参数',
                'config',
                'ready',
                `${configsStore.configurationCount} 项 · ${configsStore.configValueCount} 个配置值`,
              )
            : stage('configs', '配置参数', 'config', 'idle', '还没有维护配置参数')

    // 3. 车型标签
    const tagsStage = specsStore.error
      ? stage('tags', '车型标签', 'spec', 'error', specsStore.error)
      : specsStore.fileCount === 0
        ? stage('tags', '车型标签', 'spec', 'idle', 'specs 目录下还没有 .spec 文件')
        : specsStore.changedCount > 0
          ? stage(
              'tags',
              '车型标签',
              'spec',
              'warning',
              `${specsStore.changedCount} 个 spec 待更新`,
            )
          : specsStore.warnings.length
            ? stage(
                'tags',
                '车型标签',
                'spec',
                'warning',
                `${specsStore.warnings.length} 条适用条件提示`,
              )
            : stage(
                'tags',
                '车型标签',
                'spec',
                'ready',
                `已是最新 · ${specsStore.fileCount} 个文件 / ${specsStore.scenarioCount} 个场景`,
              )

    // 4. 出声位置目标 CPT
    const outputTarget = generatedTarget(settings.conceptOutputPath)
    const outputStage = outputStore.error
      ? stage('output-cpt', '出声位置目标 CPT', 'output', 'error', outputStore.error)
      : !outputStore.hasData
        ? stage('output-cpt', '出声位置目标 CPT', 'output', 'idle', '还没有出声位置数据')
        : outputTarget.exists
          ? stage('output-cpt', '出声位置目标 CPT', 'output', 'ready', `已生成 ${outputTarget.name}`)
          : stage(
              'output-cpt',
              '出声位置目标 CPT',
              'output',
              'warning',
              `待生成 · ${outputStore.scenarioCount} 个场景`,
            )

    // 5. SLOT 映射目标 CPT
    const slotTarget = generatedTarget(settings.slotConceptOutputPath)
    const slotStage = slotMapStore.error
      ? stage('slot-cpt', 'SLOT 映射目标 CPT', 'slot-map', 'error', slotMapStore.error)
      : !slotMapStore.hasData
        ? stage('slot-cpt', 'SLOT 映射目标 CPT', 'slot-map', 'idle', '还没有 SLOT 映射方案')
        : slotMapStore.errorPlanCount > 0
          ? stage(
              'slot-cpt',
              'SLOT 映射目标 CPT',
              'slot-map',
              'warning',
              `${slotMapStore.errorPlanCount} 个方案读取异常`,
            )
          : slotTarget.exists
            ? stage('slot-cpt', 'SLOT 映射目标 CPT', 'slot-map', 'ready', `已生成 ${slotTarget.name}`)
            : stage(
                'slot-cpt',
                'SLOT 映射目标 CPT',
                'slot-map',
                'warning',
                `待生成 · ${slotMapStore.planCount} 个方案`,
              )

    // 6. 运行环境：环境名决定 value.properties 位置，Gauge 可执行文件留空用 PATH
    const envStage = stage(
      'env',
      '运行环境',
      'task-new',
      'ready',
      `环境 ${settings.gaugeEnv || 'default'} · Gauge ${
        settings.gaugeExecutable ? '自定义路径' : 'PATH'
      }`,
    )

    // 7. Gauge 执行
    const runStage = queueStore.running
      ? stage(
          'run',
          'Gauge 执行',
          'queue',
          'running',
          `执行中 · 等待 ${queueStore.pendingCount} 项`,
        )
      : queueStore.failedCount > 0
        ? stage('run', 'Gauge 执行', 'queue', 'warning', `上次 ${queueStore.failedCount} 项失败`)
        : queueStore.successCount > 0
          ? stage('run', 'Gauge 执行', 'queue', 'ready', `已通过 ${queueStore.successCount} 项`)
          : tasksStore.tasks.length
            ? stage('run', 'Gauge 执行', 'queue', 'idle', `${tasksStore.tasks.length} 个任务待执行`)
            : stage('run', 'Gauge 执行', 'queue', 'idle', '队列为空')

    return [
      requirementsStage,
      configsStage,
      tagsStage,
      outputStage,
      slotStage,
      envStage,
      runStage,
    ]
  })

  /** 就绪阶段数（不含告警与异常） */
  const readyCount = computed(() => stages.value.filter((item) => item.status === 'ready').length)
  const totalCount = computed(() => stages.value.length)
  const blockedCount = computed(
    () => stages.value.filter((item) => item.status === 'error').length,
  )
  const pendingCount = computed(
    () => stages.value.filter((item) => item.status === 'warning').length,
  )
  const progressPercent = computed(() =>
    totalCount.value ? Math.round((readyCount.value / totalCount.value) * 100) : 0,
  )

  /** 全量刷新：右栏「刷新」按钮与页面切换都可用 */
  async function refresh() {
    await settingsStore.load()
    await requirementsStore.load()
    await configsStore.load()
    await Promise.all([
      specsStore.load(),
      outputStore.load(),
      slotMapStore.load(),
      conceptsStore.load(),
      tasksStore.load(),
    ])
  }

  return {
    stages,
    readyCount,
    totalCount,
    blockedCount,
    pendingCount,
    progressPercent,
    refresh,
  }
}
