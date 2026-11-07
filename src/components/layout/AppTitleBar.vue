<script setup lang="ts">
import { useDesignGrid } from '@/composables/useDesignGrid'
import ThemeSwitcher from '../ThemeSwitcher.vue'
import RegionToggle from './RegionToggle.vue'
import WindowControls from './WindowControls.vue'

const props = defineProps<{
  title: string
  sidebar: boolean
  panel: boolean
  secondSidebar: boolean
  /** 启动页闸门状态：未选项目时隐藏区域控件，只保留标题与设计网格开关 */
  locked?: boolean
}>()

const emit = defineEmits<{
  'update:sidebar': [value: boolean]
  'update:panel': [value: boolean]
  'update:secondSidebar': [value: boolean]
}>()

const { visible: gridVisible, toggle: toggleGrid } = useDesignGrid()

// 12 条弹性轨道 + 1 条固定宽度的窗口控制轨道（3 × 44px）。
// 前 12 条轨道即设计网格的 12 列，控件按份数落在轨道上。
const TITLEBAR_COLUMNS = 'repeat(12, minmax(0, 1fr)) 132px'
</script>

<!--
  @grid A：标题栏是水平组合容器，内部重新建立 12 列。
  按设计网格分配：左栏切换 1 份 · 标题 9 份 · 设计网格 1 份 ·
  主题 + 面板 + 右栏控制组 1 份（三者共同只占 1 份）；窗口控制为第 13 条定宽轨道。
  高度取 48 行中的 3 行（6.25dvh）。
  整条为窗口拖动区（-webkit-app-region: drag），交互控件单独标记 no-drag。
-->
<template>
  <header
    class="grid h-[6.25dvh] shrink-0 items-stretch gap-1 border-b border-line bg-surface-soft pl-1 [-webkit-app-region:drag]"
    :style="{ gridTemplateColumns: TITLEBAR_COLUMNS }"
  >
    <!-- Column span-1：左栏切换（启动页闸门下隐藏） -->
    <RegionToggle
      v-if="!props.locked"
      region="sidebar"
      :visible="props.sidebar"
      class="col-span-1 grid self-center justify-self-start [-webkit-app-region:no-drag]"
      @update:visible="emit('update:sidebar', $event)"
    />

    <!-- Column span-9（闸门下 11）：项目名 / 当前页面 -->
    <div
      class="flex min-w-0 items-center"
      :class="props.locked ? 'col-span-11 pl-2' : 'col-span-9'"
    >
      <span class="truncate text-[13px] text-ink">{{ props.title }}</span>
    </div>

    <!-- Column span-1：设计网格覆盖层开关 -->
    <button
      type="button"
      class="col-span-1 grid size-6 place-items-center justify-self-end self-center rounded text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      :class="{ 'text-primary': gridVisible }"
      :aria-pressed="gridVisible"
      :title="`${gridVisible ? '隐藏' : '显示'}设计网格（12 列 × 48 行，Ctrl+Shift+G）`"
      :aria-label="`${gridVisible ? '隐藏' : '显示'}设计网格`"
      @click="toggleGrid"
    >
      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
        <rect x="2.4" y="3.6" width="11.2" height="8.8" rx="1.8" />
        <path d="M6.1 3.6v8.8M9.9 3.6v8.8M2.4 7h11.2M2.4 9.2h11.2" />
      </svg>
    </button>

    <!-- Column span-1：主题切换 + 面板切换 + 右栏切换，三者共同占 1 份（闸门下隐藏） -->
    <div
      v-if="!props.locked"
      class="col-span-1 flex items-center justify-end gap-0.5 [-webkit-app-region:no-drag]"
    >
      <ThemeSwitcher compact />
      <RegionToggle
        region="panel"
        compact
        :visible="props.panel"
        @update:visible="emit('update:panel', $event)"
      />
      <RegionToggle
        region="secondSidebar"
        compact
        :visible="props.secondSidebar"
        @update:visible="emit('update:secondSidebar', $event)"
      />
    </div>

    <!-- 第 13 条轨道（定宽 132px）：窗口控制按钮组 -->
    <WindowControls class="col-start-13" />
  </header>
</template>
