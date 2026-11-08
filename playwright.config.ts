import { defineConfig } from '@playwright/test'

/**
 * Electron E2E 测试配置
 * 测试对象：E:\WorkSpaces\projects\外置功放专用HIL（Gauge 测试项目）
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1, // Electron 单实例锁，必须串行
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure',
  },
})
