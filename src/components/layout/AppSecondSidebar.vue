<script setup lang="ts">
const tiles = ['文件', '浏览器', '终端', '审查']
const plugins = ['PDF', '演示文稿', '电子表格', 'Word 文档']
</script>

<template>
  <aside class="hidden w-72 shrink-0 flex-col overflow-y-auto border-l border-line bg-surface-soft xl:flex">
    <!-- 新建面板（占位） -->
    <header class="px-4 py-3 text-sm font-medium">新面板</header>
    <div class="grid grid-cols-2 gap-2 px-3">
      <div
        v-for="tile in tiles"
        :key="tile"
        class="rounded-lg border border-line bg-surface px-3 py-2.5"
      >
        <p class="text-xs font-medium">{{ tile }}</p>
        <p class="mt-1 text-[11px] text-ink-muted">待接入</p>
      </div>
    </div>
    <p class="mt-3 px-4 text-[11px] leading-relaxed text-ink-muted">
      占位区域：右侧第二侧栏，后续放快捷入口与详情面板。
    </p>

    <!-- 插件（占位） -->
    <header class="mt-6 flex items-center justify-between px-4 py-2 text-xs text-ink-muted">
      <span>插件</span>
      <span>占位</span>
    </header>
    <ul class="flex flex-col gap-0.5 px-3 pb-4">
      <li
        v-for="plugin in plugins"
        :key="plugin"
        class="flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-ink-muted"
      >
        <span>{{ plugin }}</span>
        <span class="text-[11px]">待接入</span>
      </li>
    </ul>
  </aside>
</template>
