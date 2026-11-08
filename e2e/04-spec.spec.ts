/**
 * E2E：规格书页 —— 适用条件求值、车型标签、运行
 */
import { test, expect } from './fixtures'

test.describe('规格书页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('规格书页显示 spec 文件树', async ({ page }) => {
    // 测试项目有 11 个 spec 文件
    await expect(page.getByText('hil-output.spec').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('hil-slot.spec').first()).toBeVisible()
    await expect(page.getByText('hil-condition.spec').first()).toBeVisible()
    await expect(page.getByText('hil-vehicle.spec').first()).toBeVisible()
    await expect(page.getByText('hil-complex-condition.spec').first()).toBeVisible()
  })

  test('点击 spec 文件显示场景列表', async ({ page }) => {
    await page.getByText('hil-output.spec').first().click()
    await page.waitForTimeout(500)

    // 应显示场景标题
    await expect(page.getByText('智能语音').first()).toBeVisible({ timeout: 5_000 })
  })

  test('适用条件列显示条件表达式', async ({ page }) => {
    await page.getByText('hil-condition.spec').first().click()
    await page.waitForTimeout(500)

    // 应显示适用条件
    const body = await page.textContent('body')
    expect(body).toContain('适用条件')
  })

  test('运行车型输入框存在', async ({ page }) => {
    // 运行车型输入框
    const vehicleInput = page.locator('input[placeholder*="车型"]').first()
    await expect(vehicleInput).toBeVisible({ timeout: 5_000 })
  })
})
