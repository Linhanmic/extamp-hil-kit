import { ref } from 'vue'

// 外壳三块区域的可拖拽尺寸（像素）。模块级单例，拖拽状态由分隔条组件驱动
const sidebarWidth = ref(240)
const secondSidebarWidth = ref(360)
const panelHeight = ref(300)

const LIMITS = {
  sidebar: { min: 180, max: 420 },
  secondSidebar: { min: 240, max: 560 },
  // 面板上限还要受主内容区高度约束，见 resizePanel
  panel: { min: 120, max: 720 },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function useLayoutSize() {
  const resizeSidebar = (deltaX: number) => {
    sidebarWidth.value = clamp(sidebarWidth.value + deltaX, LIMITS.sidebar.min, LIMITS.sidebar.max)
  }

  // 向右拖右栏分隔条意味着右栏变窄，所以取负
  const resizeSecondSidebar = (deltaX: number) => {
    secondSidebarWidth.value = clamp(
      secondSidebarWidth.value - deltaX,
      LIMITS.secondSidebar.min,
      LIMITS.secondSidebar.max,
    )
  }

  // 向下拖面板上边界意味着面板变矮，同样取负；必须给主内容区留出空间
  const resizePanel = (deltaY: number, mainHeight: number) => {
    const max = Math.min(LIMITS.panel.max, Math.max(LIMITS.panel.min, mainHeight - 200))
    panelHeight.value = clamp(panelHeight.value - deltaY, LIMITS.panel.min, max)
  }

  return { sidebarWidth, secondSidebarWidth, panelHeight, resizeSidebar, resizeSecondSidebar, resizePanel }
}
