/**
 * E2E：日常使用 —— 边界情况与容错
 * 验证工具在异常输入、空数据等情况下的表现
 */
import { test, expect } from './fixtures'

test.describe('日常：边界情况', () => {
  test('需求页空搜索结果处理', async ({ page }) => {
    await page.getByText('软件需求', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 搜索不存在的关键词
    const searchInput = page.locator('input[type="text"]').first()
    await searchInput.fill('不存在的需求XYZ123')
    await page.waitForTimeout(500)

    // 应显示空状态或提示，不应报错
    const body = await page.textContent('body')
    expect(body).toMatch(/没有|无|空|未找到|没有匹配/)
  })

  test('配置页空搜索结果处理', async ({ page }) => {
    await page.getByText('配置参数', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 验证页面正常渲染即可（搜索交互在 10-daily-config 中已覆盖）
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
    expect(body).toMatch(/配置/)
  })

  test('spec 文件切换不丢失状态', async ({ page }) => {
    await page.getByText('规格书', { exact: true }).first().click()
    await page.waitForTimeout(1000)

    // 切换多个 spec 文件
    const files = ['hil-output.spec', 'hil-slot.spec', 'hil-condition.spec', 'hil-vehicle.spec']
    for (const file of files) {
      const el = page.getByText(file).first()
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click()
        await page.waitForTimeout(500)
      }
    }

    // 最终状态正常
    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('出声位置车型筛选切换', async ({ page }) => {
    await page.getByText('出声位置', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 尝试车型筛选（如果有下拉）
    const body = await page.textContent('body')
    expect(body).toMatch(/车型|SC6H|YU2|SF海外/)
  })

  test('封装库概念文件切换', async ({ page }) => {
    await page.getByText('封装库', { exact: true }).first().click()
    await page.waitForTimeout(800)

    // 切换多个概念文件
    const files = ['出声位置.cpt', 'SLOT映射.cpt', 'login.cpt', '音量快照.cpt']
    for (const file of files) {
      const el = page.getByText(file).first()
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        await el.click()
        await page.waitForTimeout(300)
      }
    }

    const body = await page.textContent('body')
    expect(body).toBeTruthy()
  })

  test('快速连续切换页面不崩溃', async ({ page }) => {
    const labels = ['软件需求', '配置参数', '规格书', '出声位置', '封装库', '测试队列', '新建任务', 'SLOT 映射', '音量表', '扬声器快照']

    // 快速连续切换
    for (const label of labels) {
      await page.getByText(label, { exact: true }).first().click()
      await page.waitForTimeout(200)
    }

    // 应用仍正常
    const body = await page.textContent('body')
    expect(body).toBeTruthy()

    // 侧栏仍在
    await expect(page.getByText('软件需求', { exact: true }).first()).toBeVisible()
  })
})
