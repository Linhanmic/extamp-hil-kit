<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'
import hilLogo from '../../../build/icon.png'
import { useDesignGrid } from '@/composables/useDesignGrid'
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

// 12 条弹性轨道 + 1 条固定宽度的窗口控制轨道（3 × 44px）。
// 前 12 条轨道即设计网格的 12 列，控件按份数落在轨道上。
const TITLEBAR_COLUMNS = 'repeat(12, minmax(0, 1fr)) 132px'

// 设计网格开关图标：方框 + 2×2 四个实心格，fill=currentColor 跟随文字色（开启时变主题色）
const GRID_PATH =
  'M972.8 1024H51.2a51.2 51.2 0 0 1-51.2-51.2V51.2A51.2 51.2 0 0 1 51.2 0h921.6a51.2 51.2 0 0 1 51.2 51.2v921.6a51.2 51.2 0 0 1-51.2 51.2zM102.4 921.6h819.2V102.4H102.4z M204.8 204.8h256v256H204.8zM563.2 204.8h256v256H563.2zM204.8 563.2h256v256H204.8zM563.2 563.2h256v256H563.2z'
</script>

<!--
  @grid A：标题栏是水平组合容器，内部重新建立 12 列。
  按设计网格分配：标题 8 份 · 项目设置 1 份 · 设计网格 1 份 · 控制组 2 份；
  窗口控制为第 13 条定宽轨道。高度取 48 行中的 3 行（6.25dvh）。
  控制组是三个区域开关——按「左栏 · 面板 · 右栏」排序成组，图标填充哪块就代表哪块当前展开；
  主题切换已移入「项目设置」弹窗，标题栏只保留这三个开关。
  整条为窗口拖动区（-webkit-app-region: drag），交互控件单独标记 no-drag。
-->
<template>
  <header
    class="grid h-[6.25dvh] shrink-0 items-stretch gap-1 border-b border-line bg-surface-soft pl-1 [-webkit-app-region:drag]"
    :style="{ gridTemplateColumns: TITLEBAR_COLUMNS }"
  >
    <!-- Column span-8（闸门下 11）：HIL 图标 + 中文品牌名，垂直居中，不再显示项目/路由 -->
    <div
      class="flex min-w-0 items-center gap-2 pl-2"
      :class="props.locked ? 'col-span-11' : 'col-span-8'"
    >
      <img :src="hilLogo" alt="HIL" class="size-6 shrink-0 rounded" />
      <span class="truncate text-[13px] font-medium text-ink">外置功放 HIL 工具集</span>
    </div>

    <!-- Column span-1：项目设置（启动页闸门下隐藏），图标取 Element Plus 的 Setting -->
    <button
      v-if="!props.locked"
      type="button"
      class="col-span-1 grid size-8 place-items-center justify-self-end self-center rounded text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      title="项目设置（数据文件位置、导入参数与界面主题）"
      aria-label="项目设置"
      @click="emit('settings')"
    >
      <!-- Element Plus 的 .el-icon 会继承 body 字号（15px），用 ! 压过它，保持与其他图标一致的 18px -->
      <el-icon class="text-[18px]!"><Setting /></el-icon>
    </button>

    <!-- Column span-1：设计网格覆盖层开关 -->
    <button
      type="button"
      class="col-span-1 grid size-8 place-items-center justify-self-end self-center rounded text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      :class="{ 'text-primary': gridVisible }"
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

    <!-- 第 13 条轨道（定宽 132px）：窗口控制按钮组 -->
    <WindowControls class="col-start-13" />
  </header>
</template>
