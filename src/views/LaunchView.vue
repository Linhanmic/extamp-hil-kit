<script setup lang="ts">
import appIcon from '../../build/icon.png'
import { useWorkspace } from '@/composables/useWorkspace'

const { recents, busy, error, choose, openPath } = useWorkspace()
</script>

<!--
  启动页（闸门）：未选定 Gauge 项目时不进入主界面。
  样式参考 ZCode 欢迎页：柔和渐变背景 + 居中圆角卡片，从上到下为
  ICON → 欢迎标题 → 说明 → 居中主按钮 → 最近项目。
  @grid A：卡片内部重新建立 12 列，各块整宽（col-span-12）纵向堆叠；
  按钮组按 B 方案整组占一列，内部只用一个统一 gap。
-->
<template>
  <div class="relative grid min-h-0 flex-1 place-items-center overflow-y-auto bg-surface-page p-6">
    <!-- 背景光晕 -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute -left-40 -top-48 size-[42rem] rounded-full bg-primary/25 blur-[120px]" />
      <div class="absolute -bottom-64 -right-32 size-[38rem] rounded-full bg-primary/15 blur-[120px]" />
    </div>

    <section
      class="relative w-full max-w-[30rem] rounded-3xl bg-surface px-10 py-9 text-center shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
      aria-labelledby="launch-title"
    >
      <div class="grid grid-cols-12 gap-3">
        <!-- ICON：应用桌面图标 -->
        <div class="col-span-12 flex justify-center pb-1">
          <img
            :src="appIcon"
            alt="External Amplifier HIL Kit"
            class="size-16 rounded-[18px] shadow-lg shadow-black/20"
          />
        </div>

        <!-- 欢迎标题 + 说明 -->
        <div class="col-span-12">
          <h1
            id="launch-title"
            class="text-[26px] leading-tight font-bold tracking-tight text-ink"
          >
            欢迎使用外置功放 HIL 工具集
          </h1>
          <p class="mt-2 text-sm text-ink-muted">选择外置功放微型 HIL 项目，开始测试</p>
        </div>

        <!-- 错误提示 -->
        <p
          v-if="error"
          class="col-span-12 rounded-xl border border-[color-mix(in_srgb,var(--el-color-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--el-color-danger)_10%,transparent)] px-4 py-2.5 text-xs text-[var(--el-color-danger)]"
          role="alert"
        >
          {{ error }}
        </p>

        <!-- @grid B：主按钮组，整组占满一列并居中 -->
        <div class="col-span-12 mt-4 flex flex-col gap-3">
          <button
            type="button"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-sm font-medium text-surface transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
            :disabled="busy"
            @click="choose"
          >
            <svg class="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
              <path d="M2.4 5.2A1.6 1.6 0 0 1 4 3.6h2.6l1.2 1.4H12a1.6 1.6 0 0 1 1.6 1.6v5.2A1.6 1.6 0 0 1 12 13.4H4a1.6 1.6 0 0 1-1.6-1.6z" stroke-linejoin="round" />
            </svg>
            {{ busy ? '正在打开…' : '选择外置功放微型 HIL 项目' }}
          </button>
        </div>

        <!-- 最近打开（次级按钮，样式参考 ZCode 的次要操作） -->
        <template v-if="recents.length">
          <p class="col-span-12 mt-2 mb-0.5 text-[11px] text-ink-muted">最近打开</p>
          <!-- @grid A：最近项是「名称 + 路径」组合，6 / 6 分配 -->
          <button
            v-for="item in recents"
            :key="item.path"
            type="button"
            class="col-span-12 grid h-11 grid-cols-12 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-left transition-colors outline-none hover:border-primary/40 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
            :title="item.path"
            :disabled="busy"
            @click="openPath(item.path)"
          >
            <span class="col-span-6 truncate text-xs font-medium text-ink">{{ item.name }}</span>
            <span class="col-span-6 truncate text-right text-[11px] text-ink-muted">
              {{ item.path }}
            </span>
          </button>
        </template>
      </div>
    </section>
  </div>
</template>
