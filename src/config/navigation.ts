export type NavIconName =
  | 'create'
  | 'queue'
  | 'config'
  | 'slot'
  | 'output'
  | 'meter'
  | 'snapshot'
  | 'spec'
  | 'concept'
  | 'requirement'

export interface NavItem {
  /** 路由名，同时用于侧栏选中态 */
  name: string
  path: string
  label: string
  icon: NavIconName
}

export interface NavGroup {
  /** 组标题（11px 辅助字，非第三级导航） */
  title: string
  items: NavItem[]
}

/**
 * 侧栏顺序 = 运行前真实流程（docs/hil-run-guide.md §2–§5 与右栏阶段轨一致）：
 * ① 数据准备 —— 先导入需求，再维护配置（需求变体是配置的引用源）
 * ② 场景与资产 —— 规格 tags → 出声位置 / SLOT 目标 CPT → 音量与快照 → 封装库
 * ③ 执行 —— 新建任务 → 测试队列
 * 组名带序号：结构本身表达先后，不靠读者记流程。
 * NAV_ITEMS 扁平展开供路由与首页快速入口使用。
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: '① 数据准备',
    items: [
      { name: 'requirement', path: '/requirement', label: '软件需求', icon: 'requirement' },
      { name: 'config', path: '/config', label: '配置参数', icon: 'config' },
    ],
  },
  {
    title: '② 场景与资产',
    items: [
      { name: 'spec', path: '/spec', label: '规格书', icon: 'spec' },
      { name: 'output', path: '/output', label: '出声位置', icon: 'output' },
      { name: 'slot-map', path: '/slot-map', label: 'SLOT 映射', icon: 'slot' },
      { name: 'meter', path: '/meter', label: '音量表', icon: 'meter' },
      { name: 'snapshot', path: '/snapshot', label: '扬声器快照', icon: 'snapshot' },
      { name: 'concept', path: '/concept', label: '封装库', icon: 'concept' },
    ],
  },
  {
    title: '③ 执行',
    items: [
      { name: 'task-new', path: '/task/new', label: '新建任务', icon: 'create' },
      { name: 'queue', path: '/queue', label: '测试队列', icon: 'queue' },
    ],
  },
]

/** 扁平列表：路由与首页快速入口按同一顺序展开 */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)
