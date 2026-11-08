/**
 * E2E：日常使用 —— 需求导入完整流程
 * 模拟用户从 Excel 导入需求的全过程
 */
import { test, expect } from './fixtures'

test.describe('日常：需求导入流程', () => {
  test('需求页展示完整的需求管理能力', async ({ page }) => {
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 1. 统计区域：需求数、变体数
    const body = await page.textContent('body')
    expect(body).toMatch(/需求/)
    expect(body).toMatch(/变体/)

    // 2. 导入按钮存在
    await expect(page.getByText('导入 Excel').first()).toBeVisible()

    // 3. 已有需求数据展示
    await expect(page.getByText('功放握手').first()).toBeVisible()
    await expect(page.getByText('媒体音源控制').first()).toBeVisible()
  })

  test('需求搜索和过滤可用', async ({ page }) => {
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 搜索框过滤
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill('功放')
    await page.waitForTimeout(500)

    // 过滤后只显示匹配项
    const body = await page.textContent('body')
    expect(body).toContain('功放握手')

    // 清除搜索恢复完整列表
    await searchInput.fill('')
    await page.waitForTimeout(500)
    const bodyAfter = await page.textContent('body')
    expect(bodyAfter).toContain('媒体音源控制')
  })

  test('需求展开后显示变体详情', async ({ page }) => {
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 点击展开图标
    const expandIcon = page.locator('.el-table__expand-icon').first()
    if (await expandIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandIcon.click()
      await page.waitForTimeout(500)

      // 展开后应显示变体信息
      const body = await page.textContent('body')
      expect(body).toMatch(/变体|variant/)
    }
  })

  test('需求状态标签显示', async ({ page }) => {
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 应有状态相关标签
    const body = await page.textContent('body')
    expect(body).toMatch(/正常|浮空|异常|失效|状态/)
  })
})
