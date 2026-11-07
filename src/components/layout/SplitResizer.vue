<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  direction: 'x' | 'y'
}>()

const emit = defineEmits<{
  resize: [delta: number]
}>()

const dragging = ref(false)
let last = 0

function pointerPosition(event: PointerEvent) {
  return props.direction === 'x' ? event.clientX : event.clientY
}

function onPointerDown(event: PointerEvent) {
  event.preventDefault()
  dragging.value = true
  last = pointerPosition(event)
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  const current = pointerPosition(event)
  const delta = current - last
  if (delta === 0) return
  last = current
  emit('resize', delta)
}

function onPointerUp(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}
</script>

<!--
  分隔条自身占据栅格轨道（竖直方向 4px 宽 / 水平方向 4px 高），
  既是拖动热区也是区域间的 1px 分隔线，不使用绝对定位。
-->
<template>
  <div
    role="separator"
    :aria-orientation="props.direction === 'x' ? 'vertical' : 'horizontal'"
    :class="[
      'group relative touch-none select-none',
      props.direction === 'x' ? 'h-full w-full cursor-col-resize' : 'h-1 w-full cursor-row-resize',
      dragging ? 'bg-primary/20' : '',
    ]"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <span
      :class="[
        'pointer-events-none absolute bg-line transition-colors group-hover:bg-primary',
        dragging ? 'bg-primary' : '',
        props.direction === 'x' ? 'inset-y-0 left-1/2 w-px -translate-x-1/2' : 'inset-x-0 top-1/2 h-px -translate-y-1/2',
      ]"
    />
  </div>
</template>
