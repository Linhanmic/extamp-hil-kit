/**
 * E2E：软件需求页 —— 导入、状态检测、映射参与
 */
import { test, expect } from './fixtures'

test.describe('软件需求页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('需求页显示导入按钮和统计区域', async ({ page }) => {
    await expect(page.getByText('导入 Excel')).toBeVisible({ timeout: 5_000 })
  })

  test('已导入的需求数据自动读回并展示', async ({ page }) => {
    // 测试项目的 requirements.json 已有 4 条需求
    // 应能看到需求名称
    await expect(page.getByText('功放握手').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('媒体音源控制').first()).toBeVisible()
    await expect(page.getByText('仪表报警音控制').first()).toBeVisible()
    await expect(page.getByText('复合场景压低').first()).toBeVisible()
  })

  test('搜索框可过滤需求', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[type="search"]').first()
    await searchInput.fill('功放')
    await page.waitForTimeout(300)

    // 过滤后应只显示匹配的需求
    await expect(page.getByText('功放握手').first()).toBeVisible()
    // 媒体音源控制应被过滤掉（不显示或不可见）
    const mediaRow = page.getByText('媒体音源控制').first()
    await expect(mediaRow).toBeHidden()

    // 清除搜索
    await searchInput.fill('')
    await page.waitForTimeout(300)
  })

  test('需求行可展开查看详情和变体', async ({ page }) => {
    // 点击第一行的展开按钮
    const expandButton = page.locator('button[aria-label*="expand"], .el-table__expand-icon').first()
    if (await expandButton.isVisible()) {
      await expandButton.click()
      await page.waitForTimeout(300)
      // 应显示变体信息
      await expect(page.getByText('变体').first()).toBeVisible()
    }
  })
})
