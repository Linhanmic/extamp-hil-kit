<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Setting, Switch } from '@element-plus/icons-vue'
import hilLogo from '../../../build/icon.png'
import { useDesignGrid } from '@/composables/useDesignGrid'
import { useWorkspace } from '@/composables/useWorkspace'
import RegionToggle from './RegionToggle.vue'
import WindowControls from './WindowControls.vue'

const props = defineProps<{
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
  settings: []
}>()

const { visible: gridVisible, toggle: toggleGrid } = useDesignGrid()
const { project, clear } = useWorkspace()
const route = useRoute()

/** macOS 用系统红黄绿（hiddenInset），不渲染自绘窗控轨道 */
const isMac = computed(() => window.desktop?.platform === 'darwin')

/** 面包屑：项目名 › 当前页（闸门下只显示品牌） */
const breadcrumb = computed(() => {
  const page = typeof route.meta?.title === 'string' ? route.meta.title : ''
  if (!project.value) return ''
  return page ? `${project.value.name} › ${page}` : project.value.name
})

// Windows/Linux：12 弹性轨 + 132px 窗控轨；macOS：仅 12 弹性轨（系统灯占左侧）
const TITLEBAR_COLUMNS = computed(() =>
  isMac.value ? 'repeat(12, minmax(0, 1fr))' : 'repeat(12, minmax(0, 1fr)) 132px',
)

// 设计网格开关图标：方框 + 2×2 四个实心格，fill=currentColor 跟随文字色（开启时变主题色）
const GRID_PATH =
  'M972.8 1024H51.2a51.2 51.2 0 0 1-51.2-51.2V51.2A51.2 51.2 0 0 1 51.2 0h921.6a51.2 51.2 0 0 1 51.2 51.2v921.6a51.2 51.2 0 0 1-51.2 51.2zM102.4 921.6h819.2V102.4H102.4z M204.8 204.8h256v256H204.8zM563.2 204.8h256v256H563.2zM204.8 563.2h256v256H204.8zM563.2 563.2h256v256H563.2z'
</script>

<!--
  @grid A：标题栏是水平组合容器，内部重新建立 12 列。
  按设计网格分配：标题/面包屑 7 · 项目切换 1 · 项目设置 1 · 设计网格 1 · 控制组 2；
  Windows 另有第 13 条定宽轨道（132px）放窗控。macOS 高度给系统灯留 inset。
  整条为窗口拖动区（-webkit-app-region: drag），交互控件单独标记 no-drag。
-->
<template>
  <header
    class="grid shrink-0 items-stretch gap-1 border-b border-line bg-surface-soft [-webkit-app-region:drag]"
    :class="isMac ? 'h-[38px] pl-[72px]' : 'h-[6.25dvh] pl-1'"
    :style="{ gridTemplateColumns: TITLEBAR_COLUMNS }"
  >
    <!-- Column span-7（闸门下 11）：品牌 + 面包屑「项目 › 页面」 -->
    <div
      class="flex min-w-0 items-center gap-2"
      :class="props.locked ? 'col-span-11' : 'col-span-7'"
    >
      <img :src="hilLogo" alt="HIL" class="size-6 shrink-0 rounded" />
      <span v-if="props.locked" class="truncate text-[13px] font-medium text-ink">
        外置功放 HIL 工具集
      </span>
      <template v-else>
        <span class="shrink-0 text-[13px] font-medium text-ink">外置功放 HIL 工具集</span>
        <span aria-hidden="true" class="shrink-0 text-ink-muted">·</span>
        <span class="truncate text-[13px] text-ink-muted" :title="breadcrumb">
          {{ breadcrumb }}
        </span>
      </template>
    </div>

    <!-- Column span-1：切换项目（原侧栏底部关键动作上移） -->
    <button
      v-if="!props.locked"
      type="button"
      class="col-span-1 grid size-8 place-items-center justify-self-end self-center rounded text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      title="切换 Gauge 项目"
      aria-label="切换项目"
      @click="clear"
    >
      <el-icon class="text-[18px]!"><Switch /></el-icon>
    </button>

    <!-- Column span-1：项目设置（启动页闸门下隐藏） -->
    <button
      v-if="!props.locked"
      type="button"
      class="col-span-1 grid size-8 place-items-center justify-self-end self-center rounded text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      title="项目设置（数据文件位置、导入参数与界面主题）"
      aria-label="项目设置"
      @click="emit('settings')"
    >
      <el-icon class="text-[18px]!"><Setting /></el-icon>
    </button>

    <!-- Column span-1：设计网格覆盖层开关 -->
    <button
      type="button"
      class="col-span-1 grid size-8 place-items-center justify-self-end self-center rounded text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      :class="{ 'text-primary-ink': gridVisible }"
      :aria-pressed="gridVisible"
      :title="`${gridVisible ? '隐藏' : '显示'}设计网格（12 列 × 48 行，Ctrl+Shift+G）`"
      :aria-label="`${gridVisible ? '隐藏' : '显示'}设计网格`"
      @click="toggleGrid"
    >
      <svg class="size-[18px]" viewBox="0 0 1024 1024" fill="currentColor">
        <path :d="GRID_PATH" />
      </svg>
    </button>

    <!-- Column span-2：区域开关组（左栏 · 面板 · 右栏），闸门下隐藏 -->
    <div
      v-if="!props.locked"
      class="col-span-2 flex items-center justify-end gap-0.5 [-webkit-app-region:no-drag]"
    >
      <RegionToggle
        region="sidebar"
        :visible="props.sidebar"
        @update:visible="emit('update:sidebar', $event)"
      />
      <RegionToggle
        region="panel"
        :visible="props.panel"
        @update:visible="emit('update:panel', $event)"
      />
      <RegionToggle
        region="secondSidebar"
        :visible="props.secondSidebar"
        @update:visible="emit('update:secondSidebar', $event)"
      />
    </div>

    <!-- 第 13 条轨道：仅 Windows/Linux 自绘窗控；macOS 用系统红黄绿 -->
    <WindowControls v-if="!isMac" class="col-start-13" />
  </header>
</template>
