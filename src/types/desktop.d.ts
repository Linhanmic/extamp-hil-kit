export interface WorkspaceProject {
  /** 项目根目录的绝对路径 */
  path: string
  /** 展示用名称，取目录名 */
  name: string
  openedAt: number
}

export interface WorkspaceState {
  current: WorkspaceProject | null
  recents: WorkspaceProject[]
}

/** choose / open 的返回：取消时 canceled 为 true，校验失败时带 error */
export type WorkspaceResult = { canceled?: boolean; error?: string; state: WorkspaceState }

export interface DesktopBridge {
  platform: string
  versions: {
    electron: string
    chrome: string
    node: string
  }
  window: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
    isMaximized: () => Promise<boolean>
    /** 订阅最大化状态变化，返回取消订阅函数 */
    onMaximizedChange: (callback: (value: boolean) => void) => () => void
  }
  workspace: {
    current: () => Promise<WorkspaceState>
    /** 打开系统目录选择器，选中后校验并持久化 */
    choose: () => Promise<WorkspaceResult>
    /** 直接按路径打开（最近项目列表使用），同样会校验 */
    open: (dir: string) => Promise<WorkspaceResult>
    clear: () => Promise<WorkspaceState>
  }
}

declare global {
  interface Window {
    /** 仅在 Electron 中注入；浏览器调试时为空 */
    desktop?: DesktopBridge
  }
}
