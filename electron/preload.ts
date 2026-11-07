import { contextBridge } from 'electron'

// 渲染进程不直接接触 Node：只通过 contextBridge 暴露只读的运行环境信息
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
})
