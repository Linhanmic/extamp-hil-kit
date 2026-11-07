<script setup lang="ts">
export type Region = 'sidebar' | 'panel' | 'secondSidebar'

const props = defineProps<{
  region: Region
  visible: boolean
  /** 紧凑尺寸：用于标题栏里与其他控件共同占 1 份栅格 */
  compact?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const regionLabels: Record<Region, string> = {
  sidebar: '左栏',
  panel: '面板',
  secondSidebar: '右栏',
}
</script>

<template>
  <button
    type="button"
    class="place-items-center rounded text-ink-muted transition-colors outline-none hover:bg-surface-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
    :class="props.compact ? 'size-6' : 'size-7'"
    :aria-pressed="props.visible"
    :aria-label="`${props.visible ? '隐藏' : '显示'}${regionLabels[props.region]}`"
    :title="`${props.visible ? '隐藏' : '显示'}${regionLabels[props.region]}`"
    @click="emit('update:visible', !props.visible)"
  >
    <svg
      :class="props.compact ? 'size-3.5' : 'size-4'"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
    >
      <rect x="2.4" y="3.6" width="11.2" height="8.8" rx="1.8" />
      <!-- 竖线靠左 = 左栏，横线靠下 = 面板，竖线靠右 = 右栏；区域隐藏时分隔条变淡 -->
      <line
        v-if="props.region === 'sidebar'"
        x1="5.4" y1="3.6" x2="5.4" y2="12.4"
        :class="{ 'opacity-30': !props.visible }"
      />
      <line
        v-else-if="props.region === 'panel'"
        x1="2.4" y1="9.6" x2="13.6" y2="9.6"
        :class="{ 'opacity-30': !props.visible }"
      />
      <line
        v-else
        x1="11.2" y1="3.6" x2="11.2" y2="12.4"
        :class="{ 'opacity-30': !props.visible }"
      />
    </svg>
  </button>
</template>
