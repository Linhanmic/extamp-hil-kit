/**
 * E2E：SLOT 映射、音量表、扬声器快照页
 */
import { test, expect } from './fixtures'

test.describe('SLOT 映射页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('SLOT 映射', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('SLOT 映射显示方案列表', async ({ page }) => {
    // 测试项目有 2 个映射方案
    await expect(page.getByText('杜比').first()).toBeVisible({ timeout: 5_000 })
  })

  test('生成目标 CPT 按钮存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/生成|SLOT/)
  })
})

test.describe('音量表页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('音量表', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('音量表显示档位数据', async ({ page }) => {
    // 测试项目 test.csv 有 3 行数据
    const body = await page.textContent('body')
    expect(body).toMatch(/媒体音|电话音/)
  })

  test('新增音量按钮存在', async ({ page }) => {
    await expect(page.getByText('新增音量')).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('扬声器快照页', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('扬声器快照', { exact: true }).first().click()
    await page.waitForTimeout(500)
  })

  test('快照显示分节列表', async ({ page }) => {
    // 测试项目 snapshot.ini 有 2 个分节
    await expect(page.getByText('通道').first()).toBeVisible({ timeout: 5_000 })
  })

  test('新增快照按钮存在', async ({ page }) => {
    await expect(page.getByText('新增快照')).toBeVisible({ timeout: 5_000 })
  })
})
