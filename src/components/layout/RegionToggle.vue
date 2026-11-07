<script setup lang="ts">
export type Region = 'sidebar' | 'panel' | 'secondSidebar'

const props = defineProps<{
  region: Region
  /** 区域当前是否展开；图标不随状态变化，状态只体现在 aria-pressed 与提示文字上 */
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const regionLabels: Record<Region, string> = {
  sidebar: '左栏',
  panel: '面板',
  secondSidebar: '右栏',
}

// 同一扇「窗口」的三个布局：原图的分隔线靠右 = 右栏，水平镜像 = 左栏，顺时针转 90° = 底部面板。
// 图标是静态轮廓，展开/收起不再改变它的样子。
const WINDOW_PATH =
  'M6.324148 894.416593V134.987852C6.324148 51.209481 46.136889 6.324148 129.924741 6.324148H897.042963c83.787852 0 120.623407 39.471407 120.623407 123.259259v765.487408c0 83.787852-39.471407 122.605037-123.259259 122.605037H129.583407c-83.787852 0-123.259259-39.471407-123.259259-123.259259z m692.148148 41.09274h177.777778l8.059259-0.540444c26.349037-3.185778 47.085037-21.82637 50.659556-45.539556l0.540444-7.253333v-746.666667l-0.597333-7.253333c-3.546074-23.722667-24.25363-42.382222-50.602667-45.605926l-8.059259-0.474074h-177.777778v853.333333z m-562.962963 0h480v-853.333333H135.509333l-7.253333 0.530963a53.172148 53.172148 0 0 0-45.605926 45.549037l-0.474074 7.253333v746.666667l0.530963 7.253333a53.172148 53.172148 0 0 0 52.80237 46.08z'

const regionTransform: Record<Region, string | undefined> = {
  sidebar: 'scale(-1 1) translate(-1024 0)',
  panel: 'rotate(90 512 512)',
  secondSidebar: undefined,
}
</script>

<template>
  <button
    type="button"
    class="grid size-8 place-items-center rounded text-ink-muted transition-colors outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
    :aria-pressed="props.visible"
    :aria-label="`${props.visible ? '隐藏' : '显示'}${regionLabels[props.region]}`"
    :title="`${props.visible ? '隐藏' : '显示'}${regionLabels[props.region]}`"
    @click="emit('update:visible', !props.visible)"
  >
    <svg class="size-[18px]" viewBox="0 0 1024 1024" fill="currentColor">
      <path :d="WINDOW_PATH" :transform="regionTransform[props.region]" />
    </svg>
  </button>
</template>
