<script setup lang="ts">
import ThemeSwitcher from '../ThemeSwitcher.vue'
import RegionToggle from './RegionToggle.vue'
import WindowControls from './WindowControls.vue'

const props = defineProps<{
  title: string
  sidebar: boolean
  panel: boolean
  secondSidebar: boolean
}>()

const emit = defineEmits<{
  'update:sidebar': [value: boolean]
  'update:panel': [value: boolean]
  'update:secondSidebar': [value: boolean]
}>()

// 12 条轨道：前 11 条按 1fr 均分，最后一条固定为窗口控制按钮组的实际宽度（3 × 44px），
// 避免控件列过宽导致按钮与前面的布局按钮之间出现空档
const TITLEBAR_COLUMNS = 'repeat(11, minmax(0, 1fr)) 132px'
</script>

<!--
  @grid A：标题栏是水平组合容器，内部重新建立 12 列。
  span 分配：左栏切换 1 · 标题 6 · 主题 2 · 面板切换 1 · 右栏切换 1 · 窗口控制 1（定宽轨道）
  整条为窗口拖动区（-webkit-app-region: drag），交互控件单独标记 no-drag。
-->
<template>
  <header
    class="grid h-9 shrink-0 items-stretch gap-2 border-b border-line bg-surface-soft pl-1 [-webkit-app-region:drag]"
    :style="{ gridTemplateColumns: TITLEBAR_COLUMNS }"
  >
    <!-- Column span-1：左栏切换 -->
    <RegionToggle
      region="sidebar"
      :visible="props.sidebar"
      class="col-span-1 grid self-center justify-self-start [-webkit-app-region:no-drag]"
      @update:visible="emit('update:sidebar', $event)"
    />

    <!-- Column span-6：当前页面标题（品牌名由左栏承载，这里不重复） -->
    <div class="col-span-6 flex min-w-0 items-center">
      <span class="truncate text-[13px] text-ink">工作区 / {{ props.title }}</span>
    </div>

    <!-- Column span-2：主题切换 -->
    <ThemeSwitcher class="col-span-2 self-center justify-self-end [-webkit-app-region:no-drag]" />

    <!-- Column span-1：面板切换 -->
    <RegionToggle
      region="panel"
      :visible="props.panel"
      class="col-span-1 grid self-center justify-self-end [-webkit-app-region:no-drag]"
      @update:visible="emit('update:panel', $event)"
    />

    <!-- Column span-1：右栏切换 -->
    <RegionToggle
      region="secondSidebar"
      :visible="props.secondSidebar"
      class="col-span-1 grid self-center justify-self-end [-webkit-app-region:no-drag]"
      @update:visible="emit('update:secondSidebar', $event)"
    />

    <!-- Column span-1（定宽轨道）：窗口控制按钮组 -->
    <WindowControls class="col-span-1" />
  </header>
</template>
