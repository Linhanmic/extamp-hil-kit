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
 * 侧栏按使用流程分组（sidebars：少量层级 + 简短组名）：
 * 执行 → 资产与配置 → 规格与参考。
 * 组内顺序仍见各组注释；NAV_ITEMS 供路由扁平展开。
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: '执行',
    items: [
      { name: 'task-new', path: '/task/new', label: '新建任务', icon: 'create' },
      { name: 'queue', path: '/queue', label: '测试队列', icon: 'queue' },
    ],
  },
  {
    title: '资产与配置',
    items: [
      { name: 'config', path: '/config', label: '配置参数', icon: 'config' },
      { name: 'slot-map', path: '/slot-map', label: 'SLOT 映射', icon: 'slot' },
      { name: 'output', path: '/output', label: '出声位置', icon: 'output' },
      { name: 'meter', path: '/meter', label: '音量表', icon: 'meter' },
      { name: 'snapshot', path: '/snapshot', label: '扬声器快照', icon: 'snapshot' },
    ],
  },
  {
    title: '规格与参考',
    items: [
      { name: 'spec', path: '/spec', label: '规格书', icon: 'spec' },
      { name: 'concept', path: '/concept', label: '封装库', icon: 'concept' },
      { name: 'requirement', path: '/requirement', label: '软件需求', icon: 'requirement' },
    ],
  },
]

/** 扁平列表：路由与菜单仍按单一顺序展开 */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items)
