import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { Configuration, RequirementsParseConfig } from '../src/models/common'

// 渲染进程不直接接触 Node：只通过 contextBridge 暴露只读环境信息、窗口控制与工作区操作
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
  workspace: {
    current: () => ipcRenderer.invoke('workspace:current'),
    choose: () => ipcRenderer.invoke('workspace:choose'),
    open: (dir: string) => ipcRenderer.invoke('workspace:open', dir),
    clear: () => ipcRenderer.invoke('workspace:clear'),
  },
  requirements: {
    load: () => ipcRenderer.invoke('requirements:load'),
    choose: () => ipcRenderer.invoke('requirements:choose'),
    probe: (filePath: string, sheetName: string, headerRow?: number) =>
      ipcRenderer.invoke('requirements:probe', filePath, sheetName, headerRow),
    preview: (config: RequirementsParseConfig) => ipcRenderer.invoke('requirements:preview', config),
    save: (config: RequirementsParseConfig) => ipcRenderer.invoke('requirements:save', config),
  },
  configs: {
    load: () => ipcRenderer.invoke('configs:load'),
    save: (configurations: Configuration[]) => ipcRenderer.invoke('configs:save', configurations),
  },
})
