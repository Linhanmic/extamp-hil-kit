<script setup lang="ts">
// 窗口控制三个图标：同一套 iconfont 轮廓，fill=currentColor 跟随按钮文字色（含关闭按钮的红色悬停态）
const MINIMIZE_PATH =
  'M863.7 552.5H160.3c-10.6 0-19.2-8.6-19.2-19.2v-41.7c0-10.6 8.6-19.2 19.2-19.2h703.3c10.6 0 19.2 8.6 19.2 19.2v41.7c0 10.6-8.5 19.2-19.1 19.2z'

// 双窗图形：大窗在左下、小窗探出右上，固定显示，不区分最大化 / 还原两种状态
const MAXIMIZE_PATH =
  'M959.720175 0H294.216115a63.960025 63.960025 0 0 0-63.960025 63.960025v127.92005H64.279825a63.960025 63.960025 0 0 0-63.960025 63.960025v703.560275a63.960025 63.960025 0 0 0 63.960025 63.960025h703.560275a63.960025 63.960025 0 0 0 63.960025-63.960025v-166.935665h127.92005a63.960025 63.960025 0 0 0 63.960025-63.960025V63.960025a63.960025 63.960025 0 0 0-63.960025-63.960025z m-191.880075 728.504685V959.400375H64.279825V255.8401h703.560275z m189.321674 0H831.800125V255.8401a63.960025 63.960025 0 0 0-63.960025-63.960025H294.216115V63.960025H959.720175z'

const CLOSE_PATH =
  'M773.41 196.21c15.05-15.01 39.41-14.98 54.42 0.07 14.07 14.11 15.05 36.63 2.24 51.9l-2.25 2.44-577.2 577.2c-15.05 15.01-39.41 14.98-54.42-0.07-14.07-14.11-15.05-36.63-2.24-51.9l2.25-2.44 577.2-577.2z M196.21 196.21c14.12-14.12 36.68-15.09 51.97-2.25l2.44 2.25 577.2 577.2c15.01 15.05 14.98 39.41-0.07 54.42-14.11 14.07-36.63 15.05-51.9 2.24l-2.44-2.25-577.2-577.2c-15.03-15.03-15.03-39.39 0-54.41z'

const minimize = () => void window.desktop?.window.minimize()
const toggleMaximize = () => void window.desktop?.window.toggleMaximize()
const close = () => void window.desktop?.window.close()
</script>

<!--
  @grid B：三个固定尺寸的窗口控制按钮，整组作为一个单元占满所在列（标题栏末列定宽 132px），
  内部间距为 0，右缘与窗口边缘贴合。
-->
<template>
  <div class="flex h-full w-full">
    <button
      type="button"
      class="grid h-full w-11 place-items-center text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-black/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/10"
      aria-label="最小化"
      title="最小化"
      @click="minimize"
    >
      <svg class="size-4" viewBox="0 0 1024 1024" fill="currentColor">
        <path :d="MINIMIZE_PATH" />
      </svg>
    </button>

    <button
      type="button"
      class="grid h-full w-11 place-items-center text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-black/[0.06] hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/10"
      aria-label="最大化"
      title="最大化"
      @click="toggleMaximize"
    >
      <svg class="size-4" viewBox="0 0 1024 1024" fill="currentColor">
        <path :d="MAXIMIZE_PATH" />
      </svg>
    </button>

    <button
      type="button"
      class="grid h-full w-11 place-items-center text-ink-muted transition-colors outline-none [-webkit-app-region:no-drag] hover:bg-[#c42b1c] hover:text-white focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label="关闭"
      title="关闭"
      @click="close"
    >
      <svg class="size-4" viewBox="0 0 1024 1024" fill="currentColor">
        <path :d="CLOSE_PATH" />
      </svg>
    </button>
  </div>
</template>
