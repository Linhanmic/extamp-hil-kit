/**
 * 数据模型模块入口（barrel）。
 *
 * 目前只有共享基础类型；业务模型（任务、SLOT 映射、出声位置、音量表、
 * 快照、配置参数、需求等）待数据建模确定后，每个领域一个文件在此补充导出，
 * 例如：
 *
 *   export type * from './task'
 *   export type * from './slot-map'
 *
 * 同时记得在主进程侧（electron/）用相对路径 `import type` 复用：
 * 主进程打包是独立构建，不识别 `@` 别名。
 */
export type {
  EntityId,
  IsoDateTime,
  EntityBase,
  KeyValueMap,
  PageQuery,
  PageResult,
} from './common'
