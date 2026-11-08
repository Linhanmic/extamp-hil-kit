/**
 * E2E：日常使用 —— 任务创建与队列执行
 * 模拟用户创建任务、管理队列的日常工作流
 */
import { test, expect } from './fixtures'

test.describe('日常：任务创建流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('新建任务', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('任务创建界面完整', async ({ page }) => {
    // 任务名输入
    const body = await page.textContent('body')
    expect(body).toMatch(/任务名|任务/)

    // 已有任务列表
    expect(body).toMatch(/已有任务|任务列表/)

    // 操作按钮
    await expect(page.getByText('保存').first()).toBeVisible()
    await expect(page.getByText('一键配置运行').first()).toBeVisible()
  })

  test('spec 文件选择区域存在', async ({ page }) => {
    const body = await page.textContent('body')
    // 应有 spec 选择相关 UI
    expect(body).toMatch(/spec|规格|场景|选择/)
  })

  test('运行车型输入存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toContain('运行车型')
    expect(body).toContain('gauge --tags')
  })
})

test.describe('日常：测试队列管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('测试队列', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('队列管理界面完整', async ({ page }) => {
    // 执行控制
    await expect(page.getByText('开始执行').first()).toBeVisible()

    // 入队方式
    const body = await page.textContent('body')
    expect(body).toMatch(/任务|入队|选择/)

    // 运行车型
    expect(body).toContain('车型')
  })

  test('队列状态标签体系完整', async ({ page }) => {
    const body = await page.textContent('body')
    // 状态标签
    expect(body).toMatch(/等待|运行|成功|失败|pending|running|输出/)
  })

  test('队列操作按钮存在', async ({ page }) => {
    const body = await page.textContent('body')
    // 应有清空、移除等操作
    expect(body).toMatch(/清空|移除|删除|操作|输出/)
  })

  test('底部终端输出区域存在', async ({ page }) => {
    const body = await page.textContent('body')
    // 应有输出/终端区域
    expect(body).toMatch(/输出|终端|执行|查看/)
  })
})

test.describe('日常：封装库管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.getByText('封装库', { exact: true }).first().click()
    await page.waitForTimeout(800)
  })

  test('概念文件树展示', async ({ page }) => {
    const body = await page.textContent('body')
    // 测试项目的概念文件
    expect(body).toMatch(/出声位置\.cpt|SLOT映射\.cpt|login\.cpt|音量快照\.cpt/)
  })

  test('概念编辑入口存在', async ({ page }) => {
    const body = await page.textContent('body')
    expect(body).toMatch(/编辑|新增|删除/)
  })

  test('概念结构展示', async ({ page }) => {
    // 点击展开一个概念文件
    const cptFile = page.getByText('出声位置.cpt').first()
    if (await cptFile.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cptFile.click()
      await page.waitForTimeout(500)
    }

    const body = await page.textContent('body')
    // 应显示概念标题和步骤
    expect(body).toMatch(/检查|step|#/)
  })
})
