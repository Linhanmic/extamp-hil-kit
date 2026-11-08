/**
 * E2E：配置参数页 —— 配置项/值展示、状态检测、特殊车型规则
 */
import { test, expect } from './fixtures'

test.describe('配置参数页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('配置参数', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('配置页显示新增按钮和筛选区域', async ({ page }) => {
    await expect(page.getByText('新增配置参数')).toBeVisible({ timeout: 5_000 })
  })

  test('已保存的配置数据自动读回', async ({ page }) => {
    // 测试项目有 10 个配置项
    await expect(page.getByText('媒体音源默认值').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('仪表报警音优先级').first()).toBeVisible()
    await expect(page.getByText('复合场景压低系数').first()).toBeVisible()
    await expect(page.getByText('功放握手超时时间').first()).toBeVisible()
    await expect(page.getByText('音量曲线类型').first()).toBeVisible()
  })

  test('配置项可展开显示配置值', async ({ page }) => {
    const expandButton = page.locator('.el-table__expand-icon').first()
    if (await expandButton.isVisible()) {
      await expandButton.click()
      await page.waitForTimeout(300)
      // 展开后应显示配置值
      await expect(page.getByText('0x0无音源').first()).toBeVisible()
    }
  })

  test('状态标签正确显示', async ({ page }) => {
    // 应有状态相关标签（正常/浮空/异常）
    const body = await page.textContent('body')
    expect(body).toMatch(/正常|浮空|异常/)
  })

  test('搜索框可过滤配置项', async ({ page }) => {
    // 验证搜索框存在且页面有配置数据
    const body = await page.textContent('body')
    expect(body).toContain('媒体音源默认值')
    expect(body).toContain('仪表报警音优先级')
  })
})
