<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppPanel from './components/layout/AppPanel.vue'
import AppSecondSidebar from './components/layout/AppSecondSidebar.vue'

const route = useRoute()

const routeTitle = computed(() => {
  const name = route.name
  if (name === 'home') return '首页'
  if (name === 'about') return '关于'
  return String(name ?? '')
})
</script>

<template>
  <!-- Element Plus 全局配置：中文语言包（组件由 vite 插件按需自动导入） -->
  <el-config-provider :locale="zhCn">
    <!-- 应用壳层：左栏 ｜ 中列（main_content + panel）｜ 右栏 -->
    <div class="flex h-dvh overflow-hidden bg-surface-page text-ink">
      <AppSidebar />

      <main class="flex min-w-0 flex-1 flex-col bg-surface">
        <!-- main_content -->
        <div class="flex min-h-0 flex-1 flex-col">
          <div class="flex h-10 shrink-0 items-center border-b border-line px-3">
            <span class="text-xs text-ink-muted">工作区 / {{ routeTitle }}</span>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <RouterView />
          </div>
        </div>

        <!-- panel -->
        <AppPanel class="h-[34%] min-h-32 shrink-0" />
      </main>

      <AppSecondSidebar />
    </div>
  </el-config-provider>
</template>
