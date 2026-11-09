import { beforeEach, describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { useLayoutSize, type LayoutVisibility } from '../useLayoutSize'

function setup(visible: Partial<LayoutVisibility> = {}) {
  const state = reactive<LayoutVisibility>({
    sidebar: true,
    secondSidebar: false,
    ...visible,
  })
  return { state, layout: useLayoutSize(state) }
}

describe('useLayoutSize', () => {
  // 份数是模块级共享状态，每个用例先复位到设计基准 左 2 · 右 3
  beforeEach(() => {
    const { layout } = setup()
    layout.sidebarUnits.value = 2
    layout.secondSidebarUnits.value = 3
  })

  it('右栏默认收起时只留左栏与主内容两条轨道', () => {
    expect(setup().layout.contentColumns.value).toBe('minmax(0, 16.6667%) 4px minmax(0, 1fr)')
  })

  it('展开右栏只追加右栏轨道，左栏轨道不变', () => {
    const { state, layout } = setup()

    state.secondSidebar = true
    expect(layout.contentColumns.value).toBe(
      'minmax(0, 16.6667%) 4px minmax(0, 1fr) 4px minmax(0, 25.0000%)',
    )

    state.secondSidebar = false
    expect(layout.contentColumns.value).toBe('minmax(0, 16.6667%) 4px minmax(0, 1fr)')
  })

  it('收起左栏时右栏轨道保持 3 份', () => {
    const { state, layout } = setup({ secondSidebar: true })

    state.sidebar = false
    expect(layout.contentColumns.value).toBe('minmax(0, 1fr) 4px minmax(0, 25.0000%)')
  })

  it('拖拽左栏在上下限内生效，超出上下限被夹住', () => {
    const { layout } = setup()

    // 1200px 宽窗口下 1 份 = 100px，2 份 = 200px
    layout.resizeSidebar(40, 1200)
    expect(layout.sidebarUnits.value).toBeCloseTo(2.4)
    expect(layout.contentColumns.value).toContain('20.0000%')

    layout.resizeSidebar(-1000, 1200)
    expect(layout.sidebarUnits.value).toBeCloseTo(1.8)

    layout.resizeSidebar(1000, 1200)
    expect(layout.sidebarUnits.value).toBeCloseTo(4.2)
  })

  it('向右拖右栏分隔条使右栏变窄', () => {
    const { state, layout } = setup({ secondSidebar: true })

    layout.resizeSecondSidebar(60, 1200)
    expect(layout.secondSidebarUnits.value).toBeCloseTo(2.4)

    layout.resizeSecondSidebar(-1000, 1200)
    expect(layout.secondSidebarUnits.value).toBeCloseTo(5.6)
    expect(state.secondSidebar).toBe(true)
  })

  it('可用宽度未知时忽略拖拽', () => {
    const { layout } = setup()
    layout.resizeSidebar(40, 0)
    layout.resizeSecondSidebar(40, 0)
    expect(layout.sidebarUnits.value).toBe(2)
    expect(layout.secondSidebarUnits.value).toBe(3)
  })

  it('面板高度在上下限内生效，并为上方内容留出空间', () => {
    const { layout } = setup()

    // 900px 高的主内容列，默认 panelRatio = 15/45
    expect(layout.panelHeightPercent.value).toBeCloseTo(100 / 3)
    layout.resizePanel(150, 900)
    expect(layout.panelHeightPercent.value).toBeCloseTo(100 / 6)

    layout.resizePanel(-1000, 900)
    const max = Math.min(720, 900 - 200) / 900
    expect(layout.panelHeightPercent.value).toBeCloseTo(max * 100)

    layout.resizePanel(1000, 900)
    expect(layout.panelHeightPercent.value).toBeCloseTo((120 / 900) * 100)
  })
})
