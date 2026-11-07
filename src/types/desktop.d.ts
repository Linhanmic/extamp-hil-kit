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
}

declare global {
  interface Window {
    /** 仅在 Electron 中注入；浏览器调试时为空 */
    desktop?: DesktopBridge
  }
}
