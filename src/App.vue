<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppPanel from './components/layout/AppPanel.vue'
import AppSecondSidebar from './components/layout/AppSecondSidebar.vue'
import AppTitleBar from './components/layout/AppTitleBar.vue'
import DesignGrid from './components/layout/DesignGrid.vue'
import SplitResizer from './components/layout/SplitResizer.vue'
import { useDesignGrid } from './composables/useDesignGrid'
import { useLayoutSize } from './composables/useLayoutSize'
import { useWorkspace } from './composables/useWorkspace'
import LaunchView from './views/LaunchView.vue'

const route = useRoute()

const routeTitle = computed(() => (route.meta.title as string | undefined) ?? '首页')

const { project, ready, load } = useWorkspace()
const hasProject = computed(() => project.value !== null)

// 未选项目时标题栏显示「启动」，选定后显示「项目名 / 页面名」
const titlebarTitle = computed(() =>
  hasProject.value ? `${project.value?.name} / ${routeTitle.value}` : '启动',
)

// 三块区域的显隐状态
const visible = reactive({
  sidebar: true,
  panel: true,
  secondSidebar: true,
})

const {
  sidebarUnits,
  secondSidebarUnits,
  mainUnits,
  panelHeightPercent,
  resizeSidebar,
  resizeSecondSidebar,
  resizePanel,
} = useLayoutSize()

const contentRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)

// 三栏按设计网格的 12 份分配：左 3 份 · 中 5 份 · 右 4 份（用 fr 表达，缩放窗口时保持比例），
// 两条 4px 分隔条为固定轨道
const contentColumns = computed(() => {
  const tracks: string[] = []
  if (visible.sidebar) tracks.push(`minmax(0, ${sidebarUnits.value}fr)`, '4px')
  tracks.push(`minmax(0, ${mainUnits.value}fr)`)
  if (visible.secondSidebar) tracks.push('4px', `minmax(0, ${secondSidebarUnits.value}fr)`)
  return tracks.join(' ')
})

const onSidebarResize = (delta: number) => resizeSidebar(delta, contentRef.value?.clientWidth ?? 0)
const onSecondSidebarResize = (delta: number) =>
  resizeSecondSidebar(delta, contentRef.value?.clientWidth ?? 0)
const onPanelResize = (delta: number) => resizePanel(delta, mainRef.value?.clientHeight ?? 0)

// 设计网格：标题栏按钮之外再给一个快捷键，方便设计时随手开关
const { toggle: toggleDesignGrid } = useDesignGrid()

function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g') {
    event.preventDefault()
    toggleDesignGrid()
  }
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Element Plus 全局配置：中文语言包（组件由 vite 插件按需自动导入） -->
  <el-config-provider :locale="zhCn">
    <!-- 桌面端专属外壳：自定义标题栏 + 启动页闸门 + 三栏内容区 -->
    <div class="flex h-dvh w-full flex-col overflow-hidden bg-surface-page text-ink">
      <AppTitleBar
        v-model:sidebar="visible.sidebar"
        v-model:panel="visible.panel"
        v-model:second-sidebar="visible.secondSidebar"
        :title="titlebarTitle"
        :locked="!hasProject"
      />

      <!-- 闸门：未选择 Gauge 项目时停在启动页 -->
      <LaunchView v-if="ready && !hasProject" />

      <div
        v-else-if="hasProject"
        ref="contentRef"
        class="grid min-h-0 flex-1"
        :style="{ gridTemplateColumns: contentColumns }"
      >
        <!-- 左栏：3 / 12 份 -->
        <AppSidebar v-show="visible.sidebar" />
        <SplitResizer v-show="visible.sidebar" direction="x" @resize="onSidebarResize" />

        <!-- 主内容：5 / 12 份，内部纵向分为 main_content 与 panel -->
        <main ref="mainRef" class="flex min-h-0 min-w-0 flex-col bg-surface">
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <RouterView />
          </div>

          <!-- panel 上边界：高度可拖拽 -->
          <SplitResizer v-show="visible.panel" direction="y" @resize="onPanelResize" />
          <!-- panel：48 行中的 15 行 -->
          <AppPanel v-show="visible.panel" :style="{ height: `${panelHeightPercent}%` }" />
        </main>

        <!-- 右栏：4 / 12 份 -->
        <SplitResizer
          v-show="visible.secondSidebar"
          direction="x"
          @resize="onSecondSidebarResize"
        />
        <AppSecondSidebar v-show="visible.secondSidebar" />
      </div>

      <!-- 读取工作区期间的占位，避免启动页闪一下又跳走 -->
      <div v-else class="grid min-h-0 flex-1 place-items-center text-xs text-ink-muted">
        正在读取工作区…
      </div>

      <!-- 设计辅助层：12 列 48 行网格，位于最顶层且不拦截交互 -->
      <DesignGrid />
    </div>
  </el-config-provider>
</template>
