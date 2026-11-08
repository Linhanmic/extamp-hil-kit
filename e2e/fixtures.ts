/**
 * Electron E2E 测试助手：启动应用并绑定 Gauge 测试项目
 */
import { test as base, type ElectronApplication, type Page } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { mkdirSync, writeFileSync, existsSync, rmSync, unlinkSync, readdirSync, rmdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** Gauge 测试项目根目录 */
export const TEST_PROJECT = 'E:/WorkSpaces/projects/外置功放专用HIL'

/** 沙箱 userData 根目录 */
const SANDBOX_ROOT = join(homedir(), '.extamp-hil-e2e-sandbox')

/**
 * Electron 的 userData = appData / <appName>
 * app.getPath('appData') 在 Windows 上 = APPDATA 环境变量
 * 所以 workspace.json 要写到 SANDBOX_ROOT / extamp-hil-kit / workspace.json
 */
const APP_NAME = 'extamp-hil-kit'

function prepareSandbox() {
  // 清理整个沙箱
  if (existsSync(SANDBOX_ROOT)) {
    try {
      rmSync(SANDBOX_ROOT, { recursive: true, force: true })
    } catch {
      // Windows 可能因文件锁定失败，尝试逐个删除
      try {
        const dir = join(SANDBOX_ROOT, APP_NAME)
        if (existsSync(dir)) {
          for (const f of readdirSync(dir)) {
            try { unlinkSync(join(dir, f)) } catch { /* ignore */ }
          }
          rmdirSync(dir)
        }
        rmdirSync(SANDBOX_ROOT)
      } catch { /* ignore */ }
    }
  }

  // 创建 userData 子目录（Electron 会用 appData/appName）
  const userDataDir = join(SANDBOX_ROOT, APP_NAME)
  mkdirSync(userDataDir, { recursive: true })

  // 预写工作区绑定（避免手动选择目录对话框）
  writeFileSync(
    join(userDataDir, 'workspace.json'),
    JSON.stringify({
      current: { path: TEST_PROJECT, name: '外置功放专用HIL', openedAt: Date.now() },
      recents: [{ path: TEST_PROJECT, name: '外置功放专用HIL', openedAt: Date.now() }],
    }),
    'utf8',
  )
}

interface Fixtures {
  electronApp: ElectronApplication
  page: Page
}

export const test = base.extend<Fixtures>({
  // Playwright fixture 签名要求空依赖对象，这里没有可注入依赖
  electronApp: async ({}, use) => {
    prepareSandbox()

    const app = await electron.launch({
      args: [
        '.',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
      env: {
        ...process.env,
        APPDATA: SANDBOX_ROOT,
        // 禁止 Chromium 的缓存/锁冲突
        ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      },
    })

    // 等一下让窗口创建完成
    await new Promise((r) => setTimeout(r, 1000))

    await use(app)
    await app.close()

    // 测试间隔：确保单实例锁释放
    await new Promise((r) => setTimeout(r, 500))
  },

  page: async ({ electronApp }, use) => {
    // 等待第一个窗口出现
    const page = await electronApp.firstWindow({ timeout: 15_000 })
    // 等待 Vue 应用挂载
    await page.waitForSelector('#app', { timeout: 15_000 })
    await use(page)
  },
})

export { expect } from '@playwright/test'
