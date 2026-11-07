/**
 * 配置参数（主进程侧）：读取与保存 <Gauge 项目>/.hil-kit/config.json。
 *
 * 渲染层负责编辑，主进程负责校验与写文件——渲染进程在 sandbox 下没有 Node 能力，
 * 也不能让界面绕过结构校验直接改盘上的数据。
 */
import { ipcMain } from 'electron'
import type {
  ConfigsLoadOutcome,
  ConfigsSaveOutcome,
  Configuration,
} from '../src/models/common'
import { readConfigs, writeConfigs } from './config-store'
import { readWorkspace } from './workspace'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerConfigsIpc() {
  const handle = (channel: string, listener: Parameters<typeof ipcMain.handle>[1]) => {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, listener)
  }

  handle('configs:load', () => {
    const project = readWorkspace().current
    // 没绑定项目时没有可读的数据，按「还没维护」处理
    if (!project) return { empty: true } satisfies ConfigsLoadOutcome

    try {
      return readConfigs(project.path) satisfies ConfigsLoadOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies ConfigsLoadOutcome
    }
  })

  handle('configs:save', (_event, configurations: Configuration[]) => {
    const project = readWorkspace().current
    if (!project) {
      return { error: '还没有绑定 Gauge 项目，请先在启动页选择项目' } satisfies ConfigsSaveOutcome
    }

    try {
      if (!Array.isArray(configurations)) {
        return { error: '配置参数结构不正确' } satisfies ConfigsSaveOutcome
      }
      return { saved: writeConfigs(project.path, configurations) } satisfies ConfigsSaveOutcome
    } catch (error) {
      return { error: errorMessage(error) } satisfies ConfigsSaveOutcome
    }
  })
}
