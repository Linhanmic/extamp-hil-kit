<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const isMaximized = ref(false)
let unsubscribe: (() => void) | undefined

onMounted(async () => {
  const api = window.desktop?.window
  if (!api) return
  isMaximized.value = await api.isMaximized()
  unsubscribe = api.onMaximizedChange((value) => {
    isMaximized.value = value
  })
})

onUnmounted(() => unsubscribe?.())

const minimize = () => void window.desktop?.window.minimize()
const toggleMaximize = () => void window.desktop?.window.toggleMaximize()
const close = () => void window.desktop?.window.close()
</script>

<!--
  @grid B：三个固定尺寸的窗口控制按钮，整组作为一个单元占满所在列，
  内部间距为 0（按钮自带宽度），右缘与窗口边缘贴合。
-->
<template>
  <div class="col-span-2 flex h-full justify-self-end">
    <button
      type="button"
      class="grid h-full w-11 place-items-center text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-black/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/10"
      aria-label="最小化"
      title="最小化"
      @click="minimize"
    >
      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M3 8h10" />
      </svg>
    </button>

    <button
      type="button"
      class="grid h-full w-11 place-items-center text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-black/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/10"
      :aria-label="isMaximized ? '还原' : '最大化'"
      :title="isMaximized ? '还原' : '最大化'"
      @click="toggleMaximize"
    >
      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
        <template v-if="isMaximized">
          <rect x="3.4" y="5.6" width="7" height="7" />
          <path d="M6.2 5.6V3.4h6.4v6.4h-2.2" />
        </template>
        <rect v-else x="3.6" y="3.6" width="8.8" height="8.8" />
      </svg>
    </button>

    <button
      type="button"
      class="grid h-full w-11 place-items-center text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-[#c42b1c] hover:text-white focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="关闭"
      title="关闭"
      @click="close"
    >
      <svg class="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="m4 4 8 8M12 4l-8 8" />
      </svg>
    </button>
  </div>
</template>
