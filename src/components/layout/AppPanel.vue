<script setup lang="ts">
import { useTasksStore } from '@/stores/tasks'

/** 底部终端：显示最近一次 Gauge 运行的命令、stdout、stderr 与退出码 */
const tasksStore = useTasksStore()
</script>

<template>
  <section class="flex min-h-0 flex-col overflow-hidden bg-surface">
    <!-- @grid A：面板标签栏是「标签组 + 右侧说明」的水平组合容器 -->
    <header
      class="grid h-9 shrink-0 grid-cols-12 items-center gap-2 border-b border-line bg-surface-soft px-2 text-xs"
    >
      <!-- @grid B：标签组内容固有尺寸，整组占 col-span-8，内部只用统一 gap -->
      <div class="col-span-8 flex items-center gap-1">
        <span class="flex items-center gap-1.5 rounded bg-surface px-2 py-1 font-medium text-ink">
          <span class="size-1.5 rounded-full bg-primary"></span>
          终端
        </span>
        <span class="rounded px-2 py-1 text-ink-muted">日志</span>
      </div>
      <span class="col-span-4 justify-self-end pr-1 text-[11px] text-ink-muted">
        {{ tasksStore.running ? 'Gauge 运行中' : 'Gauge 输出' }}
      </span>
    </header>

    <div class="min-h-0 flex-1 overflow-auto px-3 py-2">
      <pre class="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-ink-muted">{{ tasksStore.output }}</pre>
    </div>
  </section>
</template>
