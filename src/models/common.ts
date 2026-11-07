/**
 * 数据模型共享基础类型。
 *
 * 约定：本模块只放**类型**（编译期擦除），不放运行时代码，
 * 这样 Electron 主进程也能以 `import type` 复用同一份定义。
 */

/** 实体 ID：统一用字符串（UUID v4 或稳定的业务键） */
export type EntityId = string

/** 时间戳：ISO 8601 UTC 字符串，如 `2026-11-07T04:42:15.000Z` */
export type IsoDateTime = string

/** 所有可持久化实体共用的基础字段 */
export interface EntityBase {
  id: EntityId
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/** 松散配置项的通用键值结构 */
export type KeyValueMap = Record<string, string | number | boolean>

/** 列表查询的通用分页参数 */
export interface PageQuery {
  page: number
  pageSize: number
}

/** 列表查询的通用分页结果 */
export interface PageResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
