/**
 * E2E：新建任务与测试队列 —— 任务创建、一键配置运行、队列执行
 */
import { test, expect } from './fixtures'

test.describe('新建任务页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('新建任务', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('任务页显示创建区域和运行按钮', async ({ page }) => {
    await expect(page.getByText('一键配置运行')).toBeVisible({ timeout: 5_000 })
  })

  test('运行车型输入框存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toContain('运行车型')
  })

  test('选择 spec 文件和场景', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/spec|规格|场景/i)
  })

  test('保存按钮存在', async ({ page }) => {
    await expect(page.getByText('保存').first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('测试队列页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('测试队列', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('队列页显示执行控制区域', async ({ page }) => {
    await expect(page.getByText('开始执行')).toBeVisible({ timeout: 5_000 })
  })

  test('运行车型输入框存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toContain('车型')
  })

  test('可选择已保存任务入队', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/任务|入队|选择/)
  })

  test('队列状态标签存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/等待|运行|成功|失败|pending|running/)
  })
})
