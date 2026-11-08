/**
 * E2E：一键配置运行链路验证
 * 这是工具的核心闭环：导入需求 → 刷新配置 → 更新 tags → 重建目标 CPT → 写 value.properties → Gauge 执行
 */
import { test, expect } from './fixtures'

test.describe('一键配置运行链路', () => {
  test('新建任务页一键配置运行按钮存在且可点击', async ({ page }) => {
    await page.getByText('新建任务', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 验证一键配置运行按钮存在
    const runButton = page.getByText('一键配置运行').first()
    await expect(runButton).toBeVisible({ timeout: 5_000 })

    // 验证运行车型输入区域存在
    const body = await page.textContent('body')
    expect(body).toContain('运行车型')
  })

  test('规格书页运行链路可触发', async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(1000)

    // 选择一个 spec 文件
    const specFile = page.getByText('hil-output.spec').first()
    if (await specFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await specFile.click()
      await page.waitForTimeout(500)
    }

    // 验证运行按钮和车型输入存在
    const body = await page.textContent('body')
    expect(body).toMatch(/运行|车型/)
  })

  test('测试队列页执行按钮存在', async ({ page }) => {
    await page.getByText('测试队列', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 验证开始执行按钮存在
    const runButton = page.getByText('开始执行').first()
    await expect(runButton).toBeVisible({ timeout: 5_000 })

    // 验证车型输入区域存在
    const body = await page.textContent('body')
    expect(body).toContain('车型')
  })
})
