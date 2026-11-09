<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStages, type WorkflowStageStatus } from '@/composables/useWorkflowStages'

/**
 * 右侧第二侧栏：运行前全流程的阶段清单与实时状态。
 *
 * 阶段顺序与 docs/hil-run-guide.md 的流程一致；每行点击跳到对应页面，
 * 状态由各领域 store 推出（导入需求 / 刷新配置 / 更新车型标签 / 重建两类目标 CPT /
 * 写入运行环境 / 执行 Gauge），所以任何页面上的改动都会立刻反映在这里。
 */
const router = useRouter()
const { stages, readyCount, totalCount, blockedCount, pendingCount, progressPercent, refresh } =
  useWorkflowStages()

const refreshing = ref(false)

const statusType: Record<WorkflowStageStatus, 'success' | 'warning' | 'danger' | 'primary' | 'info'> =
  {
    ready: 'success',
    warning: 'warning',
    error: 'danger',
    running: 'primary',
    idle: 'info',
  }

// 状态点与右侧标签同色系，扫一眼就能看出卡在哪一步
const statusDot: Record<WorkflowStageStatus, string> = {
  ready: 'bg-[var(--el-color-success)]',
  warning: 'bg-[var(--el-color-warning)]',
  error: 'bg-[var(--el-color-danger)]',
  running: 'bg-primary animate-pulse',
  idle: 'bg-ink-muted/40',
}

const summaryClass = computed(() =>
  blockedCount.value
    ? 'text-[var(--el-color-danger)]'
    : pendingCount.value
      ? 'text-[var(--el-color-warning)]'
      : 'text-[var(--el-color-success)]',
)

function open(stage: (typeof stages.value)[number]) {
  void router.push({ name: stage.routeName })
}

async function onRefresh() {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}
</script>

<!-- @grid A：阶段行是「序号 · 名称与摘要 · 状态」的组合，1 / 9 / 2 分配 -->
<template>
  <aside class="flex min-h-0 flex-col overflow-y-auto bg-surface-soft">
    <!-- 标题与整体进度：标题行 + 进度条整宽 -->
    <header class="grid grid-cols-12 items-center gap-2 px-4 py-3">
      <div class="col-span-8 flex min-w-0 items-center gap-2">
        <h2 class="truncate text-sm font-medium text-ink">运行流程</h2>
        <span class="text-[11px] text-ink-muted">{{ readyCount }}/{{ totalCount }} 就绪</span>
      </div>
      <div class="col-span-4 justify-self-end">
        <el-button size="small" link type="primary" :loading="refreshing" @click="onRefresh">
          刷新
        </el-button>
      </div>
      <div class="col-span-12">
        <div class="h-1 w-full overflow-hidden rounded bg-line">
          <div
            class="h-1 rounded bg-primary transition-all"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="mt-1 text-[11px]" :class="summaryClass">
          <span v-if="blockedCount">{{ blockedCount }} 个阶段异常</span>
          <span v-else-if="pendingCount">{{ pendingCount }} 个阶段待处理</span>
          <span v-else>流程就绪，可以按车型执行</span>
        </p>
      </div>
    </header>

    <ul class="flex flex-col px-3 pb-4">
      <li v-for="(item, index) in stages" :key="item.key">
        <button
          type="button"
          class="grid w-full grid-cols-12 items-center gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary/40"
          @click="open(item)"
        >
          <span class="col-span-1 flex items-center justify-center">
            <span class="size-1.5 rounded-full" :class="statusDot[item.status]" />
          </span>
          <span class="col-span-8 min-w-0">
            <span class="block truncate text-xs font-medium text-ink">
              {{ index + 1 }} · {{ item.title }}
            </span>
            <span class="mt-0.5 block truncate text-[11px] text-ink-muted" :title="item.detail">
              {{ item.detail }}
            </span>
          </span>
          <span class="col-span-3 justify-self-end">
            <el-tag size="small" :type="statusType[item.status]" effect="plain">
              {{ item.statusLabel }}
            </el-tag>
          </span>
        </button>
        <!-- 阶段之间的连线，最后一项不画 -->
        <div v-if="index < stages.length - 1" class="mx-3 grid grid-cols-12">
          <div class="col-span-1 flex justify-center">
            <span class="h-2 w-px bg-line" />
          </div>
        </div>
      </li>
    </ul>

    <p class="mt-1 px-4 pb-4 text-[11px] leading-relaxed text-ink-muted">
      一键配置运行会按这个顺序逐个执行阶段；任一步失败即中止该次运行，并在底部终端给出原因。
    </p>
  </aside>
</template>
