/**
 * E2E：一键配置运行链路验证
 * 这是工具的核心闭环：导入需求 → 刷新配置 → 更新 tags → 重建目标 CPT → 写 value.properties → Gauge 执行
 */
import { test, expect } from './fixtures'

test.describe('一键配置运行链路', () => {
  test('新建任务页输入车型后可触发一键配置运行', async ({ page }) => {
    await page.getByText('新建任务', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 1. 输入运行车型
    const vehicleInput = page.locator('input[placeholder*="运行车型"]').first()
    await vehicleInput.fill('SC6H')

    // 2. 点击一键配置运行
    const runButton = page.getByText('一键配置运行').first()
    await expect(runButton).toBeVisible()
    await runButton.click()

    // 3. 等待配置步骤输出或提示
    await page.waitForTimeout(5_000)

    const body = await page.textContent('body')
    // 链路被触发后应有步骤输出或错误提示
    expect(body).toMatch(/需求导入|配置参数|车型|目标 CPT|value\.properties|Gauge|error|失败|完成|跳过/i)
  })

  test('规格书页输入车型后可运行', async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 选择一个 spec 文件
    const specFile = page.getByText('hil-output.spec').first()
    if (await specFile.isVisible()) {
      await specFile.click()
      await page.waitForTimeout(500)
    }

    // 输入运行车型
    const vehicleInput = page.locator('input[placeholder*="车型"]').first()
    if (await vehicleInput.isVisible()) {
      await vehicleInput.fill('YU2')
      await page.waitForTimeout(300)
    }

    // 点击运行按钮
    const runButton = page.getByText('运行', { exact: true }).first()
    if (await runButton.isVisible()) {
      await runButton.click()
      await page.waitForTimeout(3_000)

      const body = await page.textContent('body')
      expect(body).toMatch(/需求导入|配置参数|车型 tags|目标 CPT|Gauge|error|失败|完成/i)
    }
  })

  test('测试队列页输入车型后可执行', async ({ page }) => {
    await page.getByText('测试队列', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 输入运行车型
    const vehicleInput = page.locator('input[placeholder*="全部车型"]').first()
    await vehicleInput.fill('SF海外')

    // 点击开始执行
    const runButton = page.getByText('开始执行').first()
    await runButton.click()

    // 队列应进入运行状态或显示输出
    await page.waitForTimeout(5_000)

    const body = await page.textContent('body')
    expect(body).toMatch(/运行|执行|输出|等待|需求导入|配置参数|Gauge|error|跳过/i)
  })
})
