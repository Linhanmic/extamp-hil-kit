<script setup lang="ts">
import { useWorkspace } from '@/composables/useWorkspace'

const { recents, busy, error, choose, openPath } = useWorkspace()
</script>

<!--
  启动页（闸门）：未选定 Gauge 项目时不进入主界面。
  @grid A：卡片内部重新建立 12 列，各块整宽（col-span-12）纵向堆叠；
  按钮组按 B 方案整组占一列，内部只用一个统一 gap。
-->
<template>
  <div class="grid min-h-0 flex-1 place-items-center overflow-y-auto bg-surface-page p-8">
    <section
      class="w-full max-w-md rounded-xl border border-line bg-surface p-8 shadow-lg"
      aria-labelledby="launch-title"
    >
      <div class="grid grid-cols-12 gap-3">
        <!-- 标题区 -->
        <div class="col-span-12">
          <h1 id="launch-title" class="font-mono text-base font-bold text-ink">
            External Amplifier HIL Kit
          </h1>
          <p class="mt-1 text-sm text-ink">选择一个 Gauge 测试项目</p>
          <p class="mt-2 text-xs leading-relaxed text-ink-muted">
            需要绑定一个 Gauge 测试框架项目后才能进入主界面。项目目录需包含
            <code class="font-mono">manifest.json</code> 或 <code class="font-mono">.gauge</code>
            目录。
          </p>
        </div>

        <!-- 错误提示 -->
        <p
          v-if="error"
          class="col-span-12 rounded-md border border-[color-mix(in_srgb,var(--el-color-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--el-color-danger)_10%,transparent)] px-3 py-2 text-xs text-[var(--el-color-danger)]"
          role="alert"
        >
          {{ error }}
        </p>

        <!-- 操作按钮组（B 方案：整组占满一列，纵向堆叠） -->
        <div class="col-span-12 flex flex-col gap-2">
          <el-button type="primary" size="large" :loading="busy" class="w-full" @click="choose">
            选择 Gauge 项目…
          </el-button>
        </div>

        <!-- 最近项目 -->
        <template v-if="recents.length">
          <div class="col-span-12 mt-2">
            <p class="mb-1.5 text-[11px] text-ink-muted">最近打开</p>
            <!-- @grid A：最近项是「名称 + 路径」的组合，6 / 6 分配 -->
            <ul class="flex flex-col gap-1">
              <li v-for="item in recents" :key="item.path">
                <button
                  type="button"
                  class="grid w-full grid-cols-12 items-center gap-2 rounded-md border border-line px-3 py-2 text-left transition-colors outline-none hover:border-primary/40 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary/40"
                  :title="item.path"
                  :disabled="busy"
                  @click="openPath(item.path)"
                >
                  <span class="col-span-6 truncate text-xs font-medium text-ink">{{ item.name }}</span>
                  <span class="col-span-6 truncate text-[11px] text-ink-muted">{{ item.path }}</span>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
