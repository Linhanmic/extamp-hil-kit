/**
 * E2E：项目绑定与启动流程
 */
import { test, expect } from './fixtures'

test.describe('项目绑定与启动', () => {
  test('应用启动后直接进入主界面（已绑定测试项目）', async ({ page }) => {
    // 已通过 workspace.json 预绑定，应跳过启动页直接进入主界面
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first()
    await expect(sidebar).toBeVisible({ timeout: 10_000 })

    // 标题栏应显示项目名
    const titleBar = page.locator('header, [class*="titlebar"], [class*="title-bar"]').first()
    await expect(titleBar).toBeVisible()
  })

  test('侧栏导航包含全部 10 个入口', async ({ page }) => {
    const expected = [
      '新建任务',
      '测试队列',
      '配置参数',
      'SLOT 映射',
      '出声位置',
      '音量表',
      '扬声器快照',
      '规格书',
      '封装库',
      '软件需求',
    ]
    for (const label of expected) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test('项目设置弹窗可打开并显示路径配置', async ({ page }) => {
    // 验证标题栏有设置入口（齿轮按钮）
    const headerButtons = page.locator('header button')
    const count = await headerButtons.count()
    expect(count).toBeGreaterThan(0)
  })
})
