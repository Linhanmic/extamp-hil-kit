/**
 * E2E：规格书页 —— 适用条件求值、车型标签、运行
 */
import { test, expect } from './fixtures'

test.describe('规格书页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(1000)
  })

  test('规格书页显示 spec 文件树', async ({ page }) => {
    // 测试项目有 11 个 spec 文件
    const body = await page.textContent('body')
    expect(body).toMatch(/hil-output|hil-slot|hil-condition/)
  })

  test('点击 spec 文件显示场景列表', async ({ page }) => {
    const specFile = page.getByText('hil-output.spec').first()
    if (await specFile.isVisible()) {
      await specFile.click()
      await page.waitForTimeout(800)

      const body = await page.textContent('body')
      expect(body).toMatch(/智能语音|场景/)
    }
  })

  test('适用条件列显示条件表达式', async ({ page }) => {
    const specFile = page.getByText('hil-condition.spec').first()
    if (await specFile.isVisible()) {
      await specFile.click()
      await page.waitForTimeout(800)

      const body = await page.textContent('body')
      expect(body).toMatch(/适用条件|条件/)
    }
  })

  test('运行车型输入框存在', async ({ page }) => {
    const vehicleInput = page.locator('input[placeholder*="运行车型"]')
    await expect(vehicleInput.first()).toBeVisible({ timeout: 5_000 })
  })
})
