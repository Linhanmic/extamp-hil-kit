<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NAV_ITEMS } from '@/config/navigation'
import { useWorkspace } from '@/composables/useWorkspace'
import NavIcon from './NavIcon.vue'

const { project, clear } = useWorkspace()
</script>

<template>
  <aside class="flex min-h-0 flex-col overflow-hidden bg-surface-soft">
    <!-- 品牌已移至标题栏，侧栏从导航开始 -->
    <!-- 纵向导航列表；顺序定义见 src/config/navigation.ts，每一项是水平组合 -->
    <nav class="flex shrink-0 flex-col gap-0.5 p-2">
      <!-- @grid B：导航项是「图标 + 文字」组合，整项占满所在列，内部只用统一 gap -->
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.name"
        :to="item.path"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface [&.router-link-exact-active]:bg-primary/10 [&.router-link-exact-active]:text-primary"
      >
        <NavIcon :name="item.icon" />
        <span class="truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- 任务列表（占位，待接入真实数据） -->
    <div class="mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3">
      <!-- @grid A：区块头是「标题 + 计数」组合，8 / 4 分配 -->
      <div class="grid grid-cols-12 items-center gap-2 text-[11px] text-ink-muted">
        <span class="col-span-8">任务列表</span>
        <span class="col-span-4 justify-self-end">0</span>
      </div>
      <div
        class="rounded-md border border-dashed border-line px-2 py-4 text-center text-[11px] leading-relaxed text-ink-muted"
      >
        占位区域<br />任务 / 工程分组待接入
      </div>
    </div>

    <!-- @grid A：项目栏是「项目名 + 切换」组合，8 / 4 分配 -->
    <div class="grid shrink-0 grid-cols-12 items-center gap-2 border-t border-line px-3 py-2">
      <span class="col-span-8 truncate text-[11px] text-ink-muted" :title="project?.path">
        {{ project?.name }}
      </span>
      <button
        type="button"
        class="col-span-4 justify-self-end rounded px-1.5 py-1 text-[11px] text-ink-muted transition-colors outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
        title="切换 Gauge 项目"
        @click="clear"
      >
        切换
      </button>
    </div>
  </aside>
</template>
