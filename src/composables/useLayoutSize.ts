import { computed, ref } from 'vue'

// 外壳按设计网格划分：水平 12 列、垂直 48 行。
// 两侧栏以「份数」保存，主内容取剩余份数，因此区域始终精确落在网格份数上，
// 窗口缩放时比例自动保持。
const GRID_UNITS = 12

const sidebarUnits = ref(3)
const secondSidebarUnits = ref(4)

// 面板高度 15/48；主内容列高度是 48 - 3 = 45 份，换算成列高的比例即 15/45
const ROW_UNITS = 48
const TITLEBAR_ROWS = 3
const PANEL_ROWS = 15
const panelRatio = ref(PANEL_ROWS / (ROW_UNITS - TITLEBAR_ROWS))

const LIMITS = {
  sidebar: { min: 180, max: 420 },
  secondSidebar: { min: 240, max: 560 },
  panel: { min: 120, max: 720 },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function useLayoutSize() {
  const mainUnits = computed(() => GRID_UNITS - sidebarUnits.value - secondSidebarUnits.value)
  const panelHeightPercent = computed(() => panelRatio.value * 100)

  // 拖拽时把像素增量换算回网格份数，默认布局仍是 3 / 5 / 4
  const resizeSidebar = (deltaX: number, availableWidth: number) => {
    if (availableWidth <= 0) return
    const unitPx = availableWidth / GRID_UNITS
    const nextPx = clamp(
      sidebarUnits.value * unitPx + deltaX,
      LIMITS.sidebar.min,
      LIMITS.sidebar.max,
    )
    sidebarUnits.value = nextPx / unitPx
  }

  // 向右拖右栏分隔条意味着右栏变窄
  const resizeSecondSidebar = (deltaX: number, availableWidth: number) => {
    if (availableWidth <= 0) return
    const unitPx = availableWidth / GRID_UNITS
    const nextPx = clamp(
      secondSidebarUnits.value * unitPx - deltaX,
      LIMITS.secondSidebar.min,
      LIMITS.secondSidebar.max,
    )
    secondSidebarUnits.value = nextPx / unitPx
  }

  // 向下拖面板上边界意味着面板变矮；必须给主内容区留出空间
  const resizePanel = (deltaY: number, mainHeight: number) => {
    if (mainHeight <= 0) return
    const max = Math.min(LIMITS.panel.max, Math.max(LIMITS.panel.min, mainHeight - 200))
    const nextPx = clamp(panelRatio.value * mainHeight - deltaY, LIMITS.panel.min, max)
    panelRatio.value = nextPx / mainHeight
  }

  return {
    sidebarUnits,
    secondSidebarUnits,
    mainUnits,
    panelHeightPercent,
    resizeSidebar,
    resizeSecondSidebar,
    resizePanel,
  }
}
