export type NavIconName =
  | 'create'
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

/**
 * 侧栏导航顺序按使用流程排列：
 * 1. 新建任务 —— 一次测试的入口
 * 2. 配置参数 → SLOT 映射 —— 开测前的参数设置与通道对应关系
 * 3. 出声位置 → 音量表 —— 执行中的播放定位与实时电平监测
 * 4. 快照 —— 记录测量结果
 * 5. 规格 —— 按配置参数更新场景的车型标签
 * 6. 封装管理 —— 维护 concepts 目录下的可复用步骤封装（.cpt）
 * 7. 软件需求 —— 参考材料，放最后
 */
export const NAV_ITEMS: NavItem[] = [
  { name: 'task-new', path: '/task/new', label: '新建任务', icon: 'create' },
  { name: 'config', path: '/config', label: '配置参数', icon: 'config' },
  { name: 'slot-map', path: '/slot-map', label: 'SLOT 映射', icon: 'slot' },
  { name: 'output', path: '/output', label: '出声位置', icon: 'output' },
  { name: 'meter', path: '/meter', label: '音量表', icon: 'meter' },
  { name: 'snapshot', path: '/snapshot', label: '快照', icon: 'snapshot' },
  { name: 'spec', path: '/spec', label: '规格', icon: 'spec' },
  { name: 'concept', path: '/concept', label: '封装管理', icon: 'concept' },
  { name: 'requirement', path: '/requirement', label: '软件需求', icon: 'requirement' },
]
