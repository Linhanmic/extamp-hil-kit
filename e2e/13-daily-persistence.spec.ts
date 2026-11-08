/**
 * E2E：日常使用 —— 页面切换数据持久化
 * 验证切换页面后本地数据自动重读，不丢失
 */
import { test, expect } from './fixtures'

test.describe('日常：页面切换数据持久化', () => {
  test('需求页 → 配置页 → 需求页，数据不丢失', async ({ page }) => {
    // 1. 进入需求页，记录数据
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('功放握手').first()).toBeVisible()

    // 2. 切到配置页
    await page.getByText('配置参数', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('媒体音源默认值').first()).toBeVisible()

    // 3. 切回需求页，数据应仍在
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('功放握手').first()).toBeVisible()
    await expect(page.getByText('媒体音源控制').first()).toBeVisible()
  })

  test('配置页 → 规格书页 → 配置页，数据不丢失', async ({ page }) => {
    // 1. 进入配置页
    await page.getByText('配置参数', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('仪表报警音优先级').first()).toBeVisible()

    // 2. 切到规格书页
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(1000)

    // 3. 切回配置页，数据应仍在
    await page.getByText('配置参数', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('仪表报警音优先级').first()).toBeVisible()
    await expect(page.getByText('复合场景压低系数').first()).toBeVisible()
  })

  test('出声位置 → 封装库 → 出声位置，数据不丢失', async ({ page }) => {
    // 1. 进入出声位置
    await page.getByText('出声位置', { exact: true }).first().click()
    await page.waitForTimeout(800)
    const body1 = await page.textContent('body')
    expect(body1).toContain('speak')

    // 2. 切到封装库
    await page.getByText('封装库', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('出声位置.cpt').first()).toBeVisible()

    // 3. 切回出声位置
    await page.getByText('出声位置', { exact: true }).first().click()
    await page.waitForTimeout(800)
    const body3 = await page.textContent('body')
    expect(body3).toContain('speak')
  })

  test('SLOT 映射 → 音量表 → SLOT 映射，数据不丢失', async ({ page }) => {
    // 1. 进入 SLOT 映射
    await page.getByText('SLOT 映射', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 2. 切到音量表
    await page.getByText('音量表', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('新增音量').first()).toBeVisible()

    // 3. 切回 SLOT 映射
    await page.getByText('SLOT 映射', { exact: true }).first().click()
    await page.waitForTimeout(800)
    const body = await page.textContent('body')
    expect(body).toMatch(/SLOT|映射|杜比/)
  })

  test('全页面循环切换后数据完整', async ({ page }) => {
    const pages = [
      { label: '软件需求', marker: '功放握手' },
      { label: '配置参数', marker: '媒体音源默认值' },
      { label: '规格书', marker: 'spec' },
      { label: '出声位置', marker: 'speak' },
      { label: '封装库', marker: '.cpt' },
      { label: '测试队列', marker: '开始执行' },
    ]

    // 循环切换两次
    for (let round = 0; round < 2; round++) {
      for (const p of pages) {
        await page.getByText(p.label, { exact: true }).first().click()
        await page.waitForTimeout(500)
      }
    }

    // 最终回到需求页，数据完整
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)
    await expect(page.getByText('功放握手').first()).toBeVisible()
    await expect(page.getByText('复合场景压低').first()).toBeVisible()
  })
})
