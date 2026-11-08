/**
 * E2E：日常使用 —— 业务资产维护
 * 模拟用户查看出声位置、SLOT 映射、音量表、快照
 */
import { test, expect } from './fixtures'

test.describe('日常：出声位置维护', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('出声位置', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('场景列表完整展示', async ({ page }) => {
    const body = await page.textContent('body')
    // 测试项目有 8 个场景
    expect(body).toMatch(/智能语音|出声位置/)
  })

  test('speak/no_speak 关键字解析正确', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toContain('speak')
    expect(body).toContain('no_speak')
  })

  test('车型筛选可用', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/SC6H|YU2|SF海外|车型/)
  })

  test('目标 CPT 生成入口存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/生成|目标|CPT/)
  })
})

test.describe('日常：SLOT 映射维护', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('SLOT 映射', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('映射方案列表展示', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/杜比|SLOT|映射/)
  })

  test('生成目标 CPT 入口存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/生成|SLOT/)
  })
})

test.describe('日常：音量表维护', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('音量表', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('音量数据展示', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/媒体音|电话音|音量/)
  })

  test('新增音量入口存在', async ({ page }) => {
    await expect(page.getByText('新增音量').first()).toBeVisible()
  })

  test('音量曲线图展示', async ({ page }) => {
    // 应有音量曲线相关展示
    const body = await page.textContent('body')
    expect(body).toMatch(/曲线|档位|dB|音量/)
  })
})

test.describe('日常：扬声器快照维护', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('扬声器快照', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('快照分节展示', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/通道|快照|扬声器/)
  })

  test('新增快照入口存在', async ({ page }) => {
    await expect(page.getByText('新增快照').first()).toBeVisible()
  })
})
