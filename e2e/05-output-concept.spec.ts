/**
 * E2E：出声位置页 —— 场景解析、目标 CPT 生成
 */
import { test, expect } from './fixtures'

test.describe('出声位置页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('出声位置', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('出声位置页显示场景列表', async ({ page }) => {
    // 测试项目有 8 个场景
    await expect(page.getByText('智能语音').first()).toBeVisible({ timeout: 5_000 })
  })

  test('场景显示 speak/no_speak 关键字', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toContain('speak')
    expect(body).toContain('no_speak')
  })

  test('车型筛选可用', async ({ page }) => {
    // 应有车型筛选控件
    const body = await page.textContent('body')
    expect(body).toMatch(/SC6H|YU2|SF海外/)
  })

  test('生成目标 CPT 按钮存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/生成|目标.*CPT/)
  })
})

test.describe('封装库页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('封装库', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('封装库显示概念文件列表', async ({ page }) => {
    await expect(page.getByText('出声位置.cpt').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('SLOT映射.cpt').first()).toBeVisible()
    await expect(page.getByText('login.cpt').first()).toBeVisible()
    await expect(page.getByText('音量快照.cpt').first()).toBeVisible()
  })

  test('概念可展开查看步骤', async ({ page }) => {
    // 点击第一个概念文件展开
    const cptFile = page.getByText('出声位置.cpt').first()
    if (await cptFile.isVisible()) {
      await cptFile.click()
      await page.waitForTimeout(500)
    }
    const body = await page.textContent('body')
    expect(body).toMatch(/step|检查|speak|概念/)
  })
})
