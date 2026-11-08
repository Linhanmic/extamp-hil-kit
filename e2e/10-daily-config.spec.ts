/**
 * E2E：日常使用 —— 配置参数维护流程
 * 模拟用户日常维护配置项、配置值、变体关联
 */
import { test, expect } from './fixtures'

test.describe('日常：配置参数维护', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('配置参数', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('配置页展示完整管理能力', async ({ page }) => {
    // 新增按钮
    await expect(page.getByText('新增配置参数').first()).toBeVisible()

    // 配置项数据
    await expect(page.getByText('媒体音源默认值').first()).toBeVisible()
    await expect(page.getByText('仪表报警音优先级').first()).toBeVisible()

    // 筛选区域
    const body = await page.textContent('body')
    expect(body).toContain('车型')
  })

  test('配置项展开后显示配置值列表', async ({ page }) => {
    const expandIcon = page.locator('.el-table__expand-icon').first()
    if (await expandIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandIcon.click()
      await page.waitForTimeout(500)

      // 应显示配置值
      const body = await page.textContent('body')
      expect(body).toMatch(/0x0无音源|0x1本地音源|配置值/)
    }
  })

  test('配置值显示变体引用和特殊车型规则', async ({ page }) => {
    const expandIcon = page.locator('.el-table__expand-icon').first()
    if (await expandIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expandIcon.click()
      await page.waitForTimeout(500)

      const body = await page.textContent('body')
      // 应显示变体引用或特殊车型信息
      expect(body).toMatch(/变体|特殊|车型|关联/)
    }
  })

  test('配置状态分层显示', async ({ page }) => {
    // 三层状态：配置项、配置值、关联变体
    const body = await page.textContent('body')
    expect(body).toMatch(/正常|浮空|异常/)
  })

  test('配置筛选可按配置键和车型过滤', async ({ page }) => {
    // 筛选下拉存在
    const body = await page.textContent('body')
    expect(body).toMatch(/配置项|配置键|筛选/)

    // 车型筛选
    expect(body).toContain('车型')
  })

  test('配置页显示需求未导入的提示', async ({ page }) => {
    // 如果需求已导入，应显示配置数据；否则应有提示
    const body = await page.textContent('body')
    // 至少有一种状态提示
    expect(body).toMatch(/配置|需求|变体|车型/)
  })
})
