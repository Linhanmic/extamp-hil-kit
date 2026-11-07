import type {
  ConceptsDeleteOutcome,
  ConceptsListOutcome,
  ConceptsReadOutcome,
  ConceptsWriteOutcome,
  ConfigsLoadOutcome,
  ConfigsSaveOutcome,
  Configuration,
  OutputLoadOutcome,
  ProjectSettings,
  RequirementsChooseOutcome,
  RequirementsLoadOutcome,
  RequirementsParseConfig,
  RequirementsPreviewOutcome,
  RequirementsProbeOutcome,
  RequirementsSaveOutcome,
  SettingsLoadOutcome,
  SettingsPickKind,
  SettingsPickOutcome,
  SettingsSaveOutcome,
  SlotMappingLoadOutcome,
  SnapshotLoadOutcome,
  SpecsListOutcome,
  SpecsReadOutcome,
  SpecsWriteOutcome,
  VolumeTableLoadOutcome,
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
  configs: {
    /** 读取当前项目已保存的配置参数（应用启动、切换项目时用） */
    load: () => Promise<ConfigsLoadOutcome>
    /** 整份写回配置参数到 .hil-kit/config.json */
    save: (configurations: Configuration[]) => Promise<ConfigsSaveOutcome>
  }
  output: {
    /** 读取当前项目的出声位置文件 */
    load: () => Promise<OutputLoadOutcome>
  }
  meter: {
    /** 读取当前项目的音量表文件 */
    load: () => Promise<VolumeTableLoadOutcome>
  }
  slotMap: {
    /** 读取当前项目的 SLOT 映射配置及其 slot 文件 */
    load: () => Promise<SlotMappingLoadOutcome>
  }
  snapshot: {
    /** 读取当前项目扬声器快照目录下的所有快照文件 */
    load: () => Promise<SnapshotLoadOutcome>
  }
  specs: {
    /** 列出当前项目 specs 目录下的 .spec 文件 */
    list: () => Promise<SpecsListOutcome>
    /** 读取一个 spec 文件的原文 */
    read: (path: string) => Promise<SpecsReadOutcome>
    /** 整份写回 spec 文件（更新场景标签后保存） */
    write: (path: string, text: string) => Promise<SpecsWriteOutcome>
  }
  concepts: {
    /** 列出当前项目 concepts 目录下的 .cpt 文件 */
    list: () => Promise<ConceptsListOutcome>
    /** 读取一个封装文件的原文 */
    read: (path: string) => Promise<ConceptsReadOutcome>
    /** 整份写回封装文件（结构化编辑后重新生成） */
    write: (path: string, text: string) => Promise<ConceptsWriteOutcome>
    /** 删除一个封装文件 */
    delete: (path: string) => Promise<ConceptsDeleteOutcome>
  }
  settings: {
    /** 读取当前项目的设置（文件缺失时带回默认值） */
    load: () => Promise<SettingsLoadOutcome>
    /** 整份写回设置到 .hil-kit/settings.json */
    save: (settings: ProjectSettings) => Promise<SettingsSaveOutcome>
    /** 打开文件选择器，返回绝对路径 */
    pickFile: (kind: SettingsPickKind) => Promise<SettingsPickOutcome>
    /** 打开目录选择器，返回绝对路径 */
    pickDirectory: () => Promise<SettingsPickOutcome>
  }
}

declare global {
  interface Window {
    /** 仅在 Electron 中注入；浏览器调试时为空 */
    desktop?: DesktopBridge
  }
}
