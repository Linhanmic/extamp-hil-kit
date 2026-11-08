/**
 * E2E：日常使用 —— 规格书标签维护与运行
 * 模拟用户查看 spec、更新车型标签、运行验证
 */
import { test, expect } from './fixtures'

test.describe('日常：规格书标签维护', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(1000)
  })

  test('spec 文件树完整展示', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/hil-output|hil-slot|hil-condition|spec/)
  })

  test('点击 spec 后展示场景详情', async ({ page }) => {
    const specFile = page.getByText('hil-output.spec').first()
    if (await specFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await specFile.click()
      await page.waitForTimeout(800)

      const body = await page.textContent('body')
      // 应显示场景标题和适用条件
      expect(body).toMatch(/智能语音|场景|适用条件/)
    }
  })

  test('场景标签显示车型信息', async ({ page }) => {
    const specFile = page.getByText('hil-vehicle.spec').first()
    if (await specFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await specFile.click()
      await page.waitForTimeout(800)

      const body = await page.textContent('body')
      // 应显示标签列
      expect(body).toMatch(/tags|标签|smoke|regression|manual/)
    }
  })

  test('新增/减少车型列可见', async ({ page }) => {
    const specFile = page.getByText('hil-output.spec').first()
    if (await specFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await specFile.click()
      await page.waitForTimeout(800)

      const body = await page.textContent('body')
      // 应有新增/减少车型的对比信息
      expect(body).toMatch(/新增|减少|车型/)
    }
  })

  test('运行车型输入和运行按钮存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toContain('运行车型')
    expect(body).toMatch(/运行/)
  })
})

test.describe('日常：一键配置运行', () => {
  test('新建任务页一键运行入口完整', async ({ page }) => {
    await page.getByText('新建任务', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 一键配置运行按钮
    await expect(page.getByText('一键配置运行').first()).toBeVisible()

    // 运行车型输入
    const body = await page.textContent('body')
    expect(body).toContain('运行车型')

    // 保存按钮
    await expect(page.getByText('保存').first()).toBeVisible()
  })

  test('规格书页可触发运行', async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(1000)

    const body = await page.textContent('body')
    expect(body).toMatch(/运行|车型/)
  })

  test('测试队列页可执行', async ({ page }) => {
    await page.getByText('测试队列', { exact: true }).first().click()
    await page.waitForTimeout(800)

    await expect(page.getByText('开始执行').first()).toBeVisible()
  })
})
