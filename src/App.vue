<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppSidebar from './components/layout/AppSidebar.vue'
import AppPanel from './components/layout/AppPanel.vue'
import AppSecondSidebar from './components/layout/AppSecondSidebar.vue'
import AppTitleBar from './components/layout/AppTitleBar.vue'
import DesignGrid from './components/layout/DesignGrid.vue'
import SettingsDialog from './components/SettingsDialog.vue'
import SplitResizer from './components/layout/SplitResizer.vue'
import { useDesignGrid } from './composables/useDesignGrid'
import { useLayoutSize } from './composables/useLayoutSize'
import { useWorkspace } from './composables/useWorkspace'
import { useConceptsStore } from './stores/concepts'
import { useConfigsStore } from './stores/configs'
import { useMeterStore } from './stores/meter'
import { useOutputStore } from './stores/output'
import { useRequirementsStore } from './stores/requirements'
import { useSettingsStore } from './stores/settings'
import { useSlotMapStore } from './stores/slotMap'
import { useSnapshotStore } from './stores/snapshot'
import { useTasksStore } from './stores/tasks'
import { useSpecsStore } from './stores/specs'
import LaunchView from './views/LaunchView.vue'

const { project, ready, load } = useWorkspace()
const hasProject = computed(() => project.value !== null)

// 应用打开（或切换项目）时读回该项目的设置、需求、配置参数与其余业务数据
const settingsStore = useSettingsStore()
const requirementsStore = useRequirementsStore()
const configsStore = useConfigsStore()
const outputStore = useOutputStore()
const meterStore = useMeterStore()
const slotMapStore = useSlotMapStore()
const snapshotStore = useSnapshotStore()
const tasksStore = useTasksStore()
const specsStore = useSpecsStore()
const conceptsStore = useConceptsStore()
watch(
  () => project.value?.path,
  async (path) => {
    if (path) {
      void settingsStore.load()
      void outputStore.load()
      void meterStore.load()
      void slotMapStore.load()
      void snapshotStore.load()
      void conceptsStore.load()
      void tasksStore.load()
      // 配置状态依赖需求：必须先读需求再读配置，避免启动时把有效引用短暂判为失效
      await requirementsStore.load()
      await configsStore.load()
      void specsStore.load()
      return
    }
    settingsStore.clear()
    requirementsStore.clear()
    configsStore.clear()
    outputStore.clear()
    meterStore.clear()
    slotMapStore.clear()
    snapshotStore.clear()
    specsStore.clear()
    conceptsStore.clear()
    tasksStore.clear()
  },
  { immediate: true },
)

// 标题栏的项目设置入口
const settingsVisible = ref(false)

// 三块区域的显隐状态：右栏默认收起，需要时从标题栏展开
const visible = reactive({
  sidebar: true,
  panel: true,
  secondSidebar: false,
})

const { contentColumns, panelHeightPercent, resizeSidebar, resizeSecondSidebar, resizePanel } =
  useLayoutSize(visible)

const contentRef = ref<HTMLElement | null>(null)
const mainRef = ref<HTMLElement | null>(null)

// 三栏轨道由 useLayoutSize 统一给出：两侧栏固定占 3 / 12 与 4 / 12 的窗口宽度，
// 主内容吃剩余空间，收展右栏只改变主内容宽度。
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
        :locked="!hasProject"
        @settings="settingsVisible = true"
      />

      <!-- 项目设置：数据文件位置与需求导入默认参数 -->
      <SettingsDialog v-model="settingsVisible" />

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
