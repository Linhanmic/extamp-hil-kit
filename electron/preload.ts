import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  Configuration,
  ProjectSettings,
  RequirementsParseConfig,
  SettingsPickKind,
} from '../src/models/common'
import type { VolumeTableDocument } from '../src/models/volume'
import type { TaskScenario, TestTask } from '../src/models/task'

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
  menu: {
    /** 订阅应用菜单命令，返回取消订阅函数 */
    onAction: (callback: (action: string) => void) => {
      const listener = (_event: IpcRendererEvent, action: string) => callback(action)
      ipcRenderer.on('menu:action', listener)
      return () => ipcRenderer.off('menu:action', listener)
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
    saveMapping: (mapping: Record<string, boolean>) =>
      ipcRenderer.invoke('requirements:save-mapping', mapping),
  },
  configs: {
    load: () => ipcRenderer.invoke('configs:load'),
    save: (configurations: Configuration[]) => ipcRenderer.invoke('configs:save', configurations),
  },
  output: {
    load: () => ipcRenderer.invoke('output:load'),
    save: (text: string) => ipcRenderer.invoke('output:save', text),
  },
  meter: {
    load: () => ipcRenderer.invoke('meter:load'),
    save: (document: VolumeTableDocument) => ipcRenderer.invoke('meter:save', document),
  },
  slotMap: {
    load: () => ipcRenderer.invoke('slot-map:load'),
    save: (fileName: string, text: string) =>
      ipcRenderer.invoke('slot-map:save', fileName, text),
    delete: (fileName: string) => ipcRenderer.invoke('slot-map:delete', fileName),
  },
  snapshot: {
    load: () => ipcRenderer.invoke('snapshot:load'),
    save: (text: string) => ipcRenderer.invoke('snapshot:save', text),
  },
  specs: {
    list: () => ipcRenderer.invoke('specs:list'),
    read: (path: string) => ipcRenderer.invoke('specs:read', path),
    write: (path: string, text: string) => ipcRenderer.invoke('specs:write', path, text),
  },
  concepts: {
    list: () => ipcRenderer.invoke('concepts:list'),
    read: (path: string) => ipcRenderer.invoke('concepts:read', path),
    write: (path: string, text: string) => ipcRenderer.invoke('concepts:write', path, text),
    delete: (path: string) => ipcRenderer.invoke('concepts:delete', path),
    generate: (fileName: string, text: string) =>
      ipcRenderer.invoke('concepts:generate', fileName, text),
    generateSlot: (fileName: string, text: string) =>
      ipcRenderer.invoke('concepts:generate-slot', fileName, text),
  },
  tasks: {
    load: () => ipcRenderer.invoke('tasks:load'),
    save: (tasks: TestTask[]) => ipcRenderer.invoke('tasks:save', tasks),
    run: (scenarios: TaskScenario[], tags?: string) =>
      ipcRenderer.invoke('tasks:run', scenarios, tags),
    runSpec: (path: string, tags?: string) => ipcRenderer.invoke('tasks:run-spec', path, tags),
  },
  settings: {
    load: () => ipcRenderer.invoke('settings:load'),
    save: (settings: ProjectSettings) => ipcRenderer.invoke('settings:save', settings),
    pickFile: (kind: SettingsPickKind) => ipcRenderer.invoke('settings:pick-file', kind),
    pickDirectory: () => ipcRenderer.invoke('settings:pick-directory'),
  },
})
