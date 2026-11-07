<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppPanel from './components/layout/AppPanel.vue'
import AppSecondSidebar from './components/layout/AppSecondSidebar.vue'
import RegionToggle from './components/layout/RegionToggle.vue'
import ThemeSwitcher from './components/ThemeSwitcher.vue'

const route = useRoute()

const routeTitle = computed(() => {
  const name = route.name
  if (name === 'home') return '首页'
  if (name === 'about') return '关于'
  return String(name ?? '')
})

// 三块区域的显隐状态；隐藏后腾出的栅格列由主内容补齐
const visible = reactive({
  sidebar: true,
  panel: true,
  secondSidebar: true,
})

// 主内容列 = 12 - 左栏 - 右栏。用字面量类名，Tailwind 才能静态扫描到
const mainSpanClass = computed(() => {
  if (visible.sidebar && visible.secondSidebar) return 'lg:col-span-7'
  if (visible.sidebar) return 'lg:col-span-10'
  if (visible.secondSidebar) return 'lg:col-span-9'
  return 'lg:col-span-12'
})
</script>

<template>
  <!-- Element Plus 全局配置：中文语言包（组件由 vite 插件按需自动导入） -->
  <el-config-provider :locale="zhCn">
    <div class="min-h-dvh bg-surface-page text-ink">
      <!-- Container：最大宽度 + 居中 + 水平内边距 -->
      <div class="mx-auto w-full max-w-7xl px-6">
        <!-- Row：12 列栅格，沟槽统一 24px -->
        <div class="grid grid-cols-12 gap-6 py-6 lg:h-dvh">
          <!-- 左栏 Column：span-12（移动堆叠）→ lg:span-2 -->
          <AppSidebar v-show="visible.sidebar" class="col-span-12 lg:col-span-2" />

          <!-- 主内容 Column：span-12 → lg:span-7，侧栏隐藏时补到 9 / 10 / 12 -->
          <main class="col-span-12 flex min-h-0 flex-col gap-6" :class="mainSpanClass">
            <!-- 列内上半段：main_content -->
            <section
              class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface"
            >
              <div class="flex h-10 shrink-0 items-center justify-between border-b border-line px-2">
                <div class="flex min-w-0 items-center gap-1.5">
                  <RegionToggle v-model:visible="visible.sidebar" region="sidebar" class="grid" />
                  <span class="truncate pl-1 text-xs text-ink-muted">工作区 / {{ routeTitle }}</span>
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <ThemeSwitcher />
                  <RegionToggle v-model:visible="visible.panel" region="panel" class="grid" />
                  <RegionToggle
                    v-model:visible="visible.secondSidebar"
                    region="secondSidebar"
                    class="grid"
                  />
                </div>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto p-4">
                <RouterView />
              </div>
            </section>

            <!-- 列内下半段：panel（移动端固定高度，lg 起占列高 34%） -->
            <AppPanel v-show="visible.panel" class="h-56 shrink-0 lg:h-[34%]" />
          </main>

          <!-- 右栏 Column：span-12 → lg:span-3 -->
          <AppSecondSidebar v-show="visible.secondSidebar" class="col-span-12 lg:col-span-3" />
        </div>
      </div>
    </div>
  </el-config-provider>
</template>
