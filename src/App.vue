<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppPanel from './components/layout/AppPanel.vue'
import AppSecondSidebar from './components/layout/AppSecondSidebar.vue'
import AppTitleBar from './components/layout/AppTitleBar.vue'
import SplitResizer from './components/layout/SplitResizer.vue'
import { useLayoutSize } from './composables/useLayoutSize'

const route = useRoute()

const routeTitle = computed(() => {
  const name = route.name
  if (name === 'home') return '首页'
  if (name === 'about') return '关于'
  return String(name ?? '')
})

// 三块区域的显隐状态
const visible = reactive({
  sidebar: true,
  panel: true,
  secondSidebar: true,
})

const { sidebarWidth, secondSidebarWidth, panelHeight, resizeSidebar, resizeSecondSidebar, resizePanel } =
  useLayoutSize()

const mainRef = ref<HTMLElement | null>(null)

// 外壳是三段可拖拽的像素轨道：左栏 · 分隔条 · 主内容 · 分隔条 · 右栏
// （区域尺寸由鼠标拖拽决定，因此轨道用像素表达；区域内部的水平布局仍走 12 列栅格）
const contentColumns = computed(() => {
  const tracks: string[] = []
  if (visible.sidebar) tracks.push(`${sidebarWidth.value}px`, '4px')
  tracks.push('minmax(0, 1fr)')
  if (visible.secondSidebar) tracks.push('4px', `${secondSidebarWidth.value}px`)
  return tracks.join(' ')
})

const onPanelResize = (delta: number) => resizePanel(delta, mainRef.value?.clientHeight ?? 0)
</script>

<template>
  <!-- Element Plus 全局配置：中文语言包（组件由 vite 插件按需自动导入） -->
  <el-config-provider :locale="zhCn">
    <!-- 桌面端专属外壳：自定义标题栏 + 可拖拽三栏内容区，铺满窗口 -->
    <div class="flex h-dvh w-full flex-col overflow-hidden bg-surface-page text-ink">
      <AppTitleBar
        v-model:sidebar="visible.sidebar"
        v-model:panel="visible.panel"
        v-model:second-sidebar="visible.secondSidebar"
        :title="routeTitle"
      />

      <div class="grid min-h-0 flex-1" :style="{ gridTemplateColumns: contentColumns }">
        <!-- 左栏：宽度可拖拽 -->
        <AppSidebar v-show="visible.sidebar" />
        <SplitResizer v-show="visible.sidebar" direction="x" @resize="resizeSidebar" />

        <!-- 主内容：自适应剩余宽度，内部纵向分为 main_content 与 panel -->
        <main ref="mainRef" class="flex min-h-0 min-w-0 flex-col bg-surface">
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <RouterView />
          </div>

          <!-- panel 上边界：高度可拖拽 -->
          <SplitResizer v-show="visible.panel" direction="y" @resize="onPanelResize" />
          <AppPanel v-show="visible.panel" :style="{ height: `${panelHeight}px` }" />
        </main>

        <!-- 右栏：宽度可拖拽 -->
        <SplitResizer v-show="visible.secondSidebar" direction="x" @resize="resizeSecondSidebar" />
        <AppSecondSidebar v-show="visible.secondSidebar" />
      </div>
    </div>
  </el-config-provider>
</template>
