<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppPanel from './components/layout/AppPanel.vue'
import AppSecondSidebar from './components/layout/AppSecondSidebar.vue'
import RegionToggle from './components/layout/RegionToggle.vue'

const route = useRoute()

const routeTitle = computed(() => {
  const name = route.name
  if (name === 'home') return '首页'
  if (name === 'about') return '关于'
  return String(name ?? '')
})

// 三块区域的显隐状态；隐藏后腾出的空间自动归中列
const visible = reactive({
  sidebar: true,
  panel: true,
  secondSidebar: true,
})
</script>

<template>
  <!-- Element Plus 全局配置：中文语言包（组件由 vite 插件按需自动导入） -->
  <el-config-provider :locale="zhCn">
    <!-- 应用壳层：左栏 ｜ 中列（main_content + panel）｜ 右栏 -->
    <div class="flex h-dvh overflow-hidden bg-surface-page text-ink">
      <AppSidebar v-show="visible.sidebar" />

      <main class="flex min-w-0 flex-1 flex-col bg-surface">
        <!-- main_content -->
        <div class="flex min-h-0 flex-1 flex-col">
          <div class="flex h-10 shrink-0 items-center justify-between border-b border-line px-2">
            <div class="flex items-center gap-1.5">
              <RegionToggle
                v-model:visible="visible.sidebar"
                region="sidebar"
                class="hidden lg:grid"
              />
              <span class="pl-1 text-xs text-ink-muted">工作区 / {{ routeTitle }}</span>
            </div>

            <div class="flex items-center gap-0.5">
              <RegionToggle v-model:visible="visible.panel" region="panel" class="grid" />
              <RegionToggle
                v-model:visible="visible.secondSidebar"
                region="secondSidebar"
                class="hidden xl:grid"
              />
            </div>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <RouterView />
          </div>
        </div>

        <!-- panel -->
        <AppPanel v-show="visible.panel" class="h-[34%] min-h-32 shrink-0" />
      </main>

      <AppSecondSidebar v-show="visible.secondSidebar" />
    </div>
  </el-config-provider>
</template>
