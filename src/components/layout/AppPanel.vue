<template>
  <section class="flex min-h-0 flex-col border-t border-line bg-surface">
    <!-- 面板标签栏（占位，尚未接入具体功能） -->
    <header
      class="flex h-9 shrink-0 items-center justify-between border-b border-line bg-surface-soft px-2"
    >
      <div class="flex items-center gap-1 text-xs">
        <span class="flex items-center gap-1.5 rounded px-2 py-1 bg-surface font-medium text-ink">
          <span class="size-1.5 rounded-full bg-primary"></span>
          终端
        </span>
        <span class="rounded px-2 py-1 text-ink-muted">日志</span>
      </div>
      <span class="pr-1 text-[11px] text-ink-muted">panel 占位</span>
    </header>

    <!-- 面板内容区 -->
    <div class="min-h-0 flex-1 overflow-auto px-3 py-2">
      <p class="text-xs leading-relaxed text-ink-muted">
        占位区域：后续放终端输出 / 运行日志 / 控制台。
      </p>
    </div>
  </section>
</template>
