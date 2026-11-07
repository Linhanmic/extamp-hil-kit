<script setup lang="ts">
const tiles = ['文件', '浏览器', '终端', '审查']
const plugins = ['PDF', '演示文稿', '电子表格', 'Word 文档']
</script>

<template>
  <aside class="flex min-h-0 flex-col overflow-y-auto bg-surface-soft">
    <!-- 单个标题：原子元素，直接对齐所在列轨道，不单独分配 span -->
    <header class="px-4 py-3 text-sm font-medium">新面板</header>

    <!-- @grid A：瓦片网格，两列即每块 col-span-6 -->
    <div class="grid grid-cols-12 gap-2 px-3">
      <div
        v-for="tile in tiles"
        :key="tile"
        class="col-span-6 rounded-lg border border-line bg-surface px-3 py-2.5"
      >
        <p class="text-xs font-medium">{{ tile }}</p>
        <p class="mt-1 text-[11px] text-ink-muted">待接入</p>
      </div>
    </div>
    <p class="mt-3 px-4 text-[11px] leading-relaxed text-ink-muted">
      占位区域：右侧第二侧栏，后续放快捷入口与详情面板。
    </p>

    <!-- @grid A：区块头是「标题 + 右侧计数」的组合 -->
    <header
      class="mt-6 grid grid-cols-12 items-center gap-2 px-4 py-2 text-xs text-ink-muted"
    >
      <span class="col-span-8">插件</span>
      <span class="col-span-4 justify-self-end">占位</span>
    </header>

    <!-- 纵向列表容器，行内是水平组合，见下条注释 -->
    <ul class="flex flex-col gap-0.5 px-3 pb-4">
      <!-- @grid A：列表行是「名称 + 状态」的组合，8 / 4 分配 -->
      <li
        v-for="plugin in plugins"
        :key="plugin"
        class="grid grid-cols-12 items-center gap-2 rounded-md px-2 py-1.5 text-xs text-ink-muted"
      >
        <span class="col-span-8 truncate">{{ plugin }}</span>
        <span class="col-span-4 justify-self-end text-[11px]">待接入</span>
      </li>
    </ul>
  </aside>
</template>
