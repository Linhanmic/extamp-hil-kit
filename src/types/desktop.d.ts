import type {
  RequirementsChooseOutcome,
  RequirementsLoadOutcome,
  RequirementsParseConfig,
  RequirementsPreviewOutcome,
  RequirementsProbeOutcome,
  RequirementsSaveOutcome,
} from '@/models'

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
  requirements: {
    /** 读取当前项目已保存的需求数据（应用启动、切换项目时用） */
    load: () => Promise<RequirementsLoadOutcome>
    /** 打开文件选择器挑需求分析表，返回文件路径与工作表名 */
    choose: () => Promise<RequirementsChooseOutcome>
    /** 探测表头行与列位置，用于预填列配置 */
    probe: (filePath: string, sheetName: string, headerRow?: number) => Promise<RequirementsProbeOutcome>
    /** 按列配置解析整张表，返回预览数据（不落盘） */
    preview: (config: RequirementsParseConfig) => Promise<RequirementsPreviewOutcome>
    /** 解析并写入项目目录 .hil-kit/requirements.json */
    save: (config: RequirementsParseConfig) => Promise<RequirementsSaveOutcome>
  }
}

declare global {
  interface Window {
    /** 仅在 Electron 中注入；浏览器调试时为空 */
    desktop?: DesktopBridge
  }
}
