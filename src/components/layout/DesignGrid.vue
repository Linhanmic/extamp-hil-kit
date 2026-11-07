<script setup lang="ts">
import { useDesignGrid } from '@/composables/useDesignGrid'

const { visible } = useDesignGrid()

const COLUMNS = 12
const ROWS = 48

// 用 repeating-linear-gradient 画等距网格线。颜色取主题主色的半透明变体：
// 列线更明显（45%），行线更淡（18%，48 行较密，避免压住内容）。
// 再补一圈同列线的描边，标出视口边界。
const gridStyle = {
  backgroundImage: [
    `repeating-linear-gradient(to right, color-mix(in srgb, var(--el-color-primary) 45%, transparent) 0 1px, transparent 1px calc(100% / ${COLUMNS}))`,
    `repeating-linear-gradient(to bottom, color-mix(in srgb, var(--el-color-primary) 18%, transparent) 0 1px, transparent 1px calc(100% / ${ROWS}))`,
  ].join(', '),
  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--el-color-primary) 45%, transparent)',
}
</script>

<!--
  设计辅助层：铺满窗口、位于最顶层、不接收鼠标事件，
  用于核对/调整界面元素与 12 列 48 行网格的对齐关系。
-->
<template>
  <div
    v-show="visible"
    class="pointer-events-none fixed inset-0 z-[9999]"
    :style="gridStyle"
    aria-hidden="true"
  />
</template>
