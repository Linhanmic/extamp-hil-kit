<script setup lang="ts">
const version = __APP_VERSION__
</script>

<template>
  <div class="flex flex-col gap-4 py-2">
    <div>
      <h1 class="text-xl font-semibold text-ink">关于</h1>
      <p class="mt-2 text-sm leading-6 text-ink-muted">
        External Amplifier HIL Kit 是桌面端外置功放 HIL 测试工具台，把需求变体、配置参数、业务资产、
        Gauge 规格、目标 CPT 与运行环境串成多车型测试闭环。
      </p>
    </div>

    <dl class="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
      <div class="rounded-md border border-ink-muted/20 px-3 py-2">
        <dt class="text-xs text-ink-muted">应用名称</dt>
        <dd class="mt-1 font-medium text-ink">extamp-hil-kit</dd>
      </div>
      <div class="rounded-md border border-ink-muted/20 px-3 py-2">
        <dt class="text-xs text-ink-muted">版本</dt>
        <dd class="mt-1 font-medium text-ink">v{{ version }}</dd>
      </div>
      <div class="rounded-md border border-ink-muted/20 px-3 py-2">
        <dt class="text-xs text-ink-muted">技术栈</dt>
        <dd class="mt-1 font-medium text-ink">Vue 3 · Electron · Vite</dd>
      </div>
      <div class="rounded-md border border-ink-muted/20 px-3 py-2">
        <dt class="text-xs text-ink-muted">文档</dt>
        <dd class="mt-1 font-medium text-ink">见仓库 README 与 docs/</dd>
      </div>
    </dl>
  </div>
</template>
