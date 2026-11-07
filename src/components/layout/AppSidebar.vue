<script setup lang="ts">
import { RouterLink } from 'vue-router'

const navItems = [
  { label: '首页', to: '/', icon: 'home' },
  { label: '关于', to: '/about', icon: 'info' },
] as const
</script>

<template>
  <aside class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface-soft">
    <!-- 品牌 -->
    <div class="flex items-center gap-2 border-b border-line px-3 py-2.5">
      <span
        class="grid size-7 shrink-0 place-items-center rounded-md bg-primary text-[10px] font-semibold tracking-tight text-white"
        >HIL</span
      >
      <span class="truncate text-sm font-medium">extamp-hil-kit</span>
    </div>

    <!-- 主导航 -->
    <nav class="flex flex-col gap-0.5 p-2">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface [&.router-link-exact-active]:bg-primary/10 [&.router-link-exact-active]:text-primary"
      >
        <svg
          v-if="item.icon === 'home'"
          class="size-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <path d="M2.5 6.8 8 2.5l5.5 4.3v6.4h-4v-3.4h-3v3.4h-4z" stroke-linejoin="round" />
        </svg>
        <svg
          v-else
          class="size-4 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
        >
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 7.4v4.2" stroke-linecap="round" />
          <circle cx="8" cy="4.9" r="0.8" fill="currentColor" stroke="none" />
        </svg>
        <span class="truncate">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <!-- 任务列表（占位，待接入真实数据） -->
    <div class="mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-3">
      <div class="flex items-center justify-between text-[11px] text-ink-muted">
        <span>任务列表</span>
        <span>0</span>
      </div>
      <div
        class="rounded-md border border-dashed border-line px-2 py-4 text-center text-[11px] leading-relaxed text-ink-muted"
      >
        占位区域<br />任务 / 工程分组待接入
      </div>
    </div>
  </aside>
</template>
