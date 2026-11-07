import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

// 渲染进程不直接接触 Node：只通过 contextBridge 暴露只读环境信息与窗口控制
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (value: boolean) => void) => {
      const listener = (_event: IpcRendererEvent, value: boolean) => callback(value)
      ipcRenderer.on('window:maximized-change', listener)
      return () => ipcRenderer.off('window:maximized-change', listener)
    },
  },
})
