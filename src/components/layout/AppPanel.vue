<template>
  <section class="flex min-h-0 flex-col overflow-hidden bg-surface">
    <!-- @grid A：面板标签栏是「标签组 + 右侧说明」的水平组合容器 -->
    <header
      class="grid h-9 shrink-0 grid-cols-12 items-center gap-2 border-b border-line bg-surface-soft px-2 text-xs"
    >
      <!-- @grid B：标签组内容固有尺寸，整组占 col-span-8，内部只用统一 gap -->
      <div class="col-span-8 flex items-center gap-1">
        <span class="flex items-center gap-1.5 rounded bg-surface px-2 py-1 font-medium text-ink">
          <span class="size-1.5 rounded-full bg-primary"></span>
          终端
        </span>
        <span class="rounded px-2 py-1 text-ink-muted">日志</span>
      </div>
      <span class="col-span-4 justify-self-end pr-1 text-[11px] text-ink-muted">panel 占位</span>
    </header>

    <!-- 面板内容区 -->
    <div class="min-h-0 flex-1 overflow-auto px-3 py-2">
      <p class="text-xs leading-relaxed text-ink-muted">
        占位区域：后续放终端输出 / 运行日志 / 控制台。
      </p>
    </div>
  </section>
</template>
