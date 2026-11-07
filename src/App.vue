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
  if (visible.sidebar && visible.secondSidebar) return 'col-span-7'
  if (visible.sidebar) return 'col-span-10'
  if (visible.secondSidebar) return 'col-span-9'
  return 'col-span-12'
})
</script>

<template>
  <!-- Element Plus 全局配置：中文语言包（组件由 vite 插件按需自动导入） -->
  <el-config-provider :locale="zhCn">
    <!-- 桌面端专属外壳：铺满窗口，区域之间不留沟槽，靠 1px 分隔线划分 -->
    <div class="h-dvh w-full overflow-hidden bg-surface-page text-ink">
      <!-- Container：桌面端全宽，不设最大宽度与内边距 -->
      <div class="h-full w-full">
        <!-- Row：12 列栅格，页面级 gap-0（区域贴合），沟槽只出现在组件内部 -->
        <div class="grid h-full grid-cols-12 gap-0">
          <!-- 左栏 Column：span-2 -->
          <AppSidebar v-show="visible.sidebar" class="col-span-2" />

          <!-- 主内容 Column：span-7，侧栏隐藏时补到 9 / 10 / 12 -->
          <main class="flex min-h-0 min-w-0 flex-col bg-surface" :class="mainSpanClass">
            <!-- 列内上半段：main_content -->
            <section class="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
              <!-- @grid A：工具栏是水平组合容器，内部重新建立 12 列栅格 -->
              <div
                class="grid h-10 shrink-0 grid-cols-12 items-center gap-2 border-b border-line px-2"
              >
                <RegionToggle
                  v-model:visible="visible.sidebar"
                  region="sidebar"
                  class="col-span-1 grid justify-self-start"
                />
                <span class="col-span-6 truncate pl-1 text-xs text-ink-muted">
                  工作区 / {{ routeTitle }}
                </span>
                <ThemeSwitcher class="col-span-3 justify-self-end" />
                <RegionToggle
                  v-model:visible="visible.panel"
                  region="panel"
                  class="col-span-1 grid justify-self-end"
                />
                <RegionToggle
                  v-model:visible="visible.secondSidebar"
                  region="secondSidebar"
                  class="col-span-1 grid justify-self-end"
                />
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto p-4">
                <RouterView />
              </div>
            </section>

            <!-- 列内下半段：panel，占列高 34%，与上半段直接贴合 -->
            <AppPanel v-show="visible.panel" class="h-[34%] shrink-0" />
          </main>

          <!-- 右栏 Column：span-3 -->
          <AppSecondSidebar v-show="visible.secondSidebar" class="col-span-3" />
        </div>
      </div>
    </div>
  </el-config-provider>
</template>
