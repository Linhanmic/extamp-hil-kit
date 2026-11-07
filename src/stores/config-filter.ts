import type { ConfigurationRow, VariantRefStatus } from './configs'

export type IssueFilter = '' | 'normal' | 'issue'

export interface ConfigurationFilters {
  configKey: string
  vehicle: string
  itemStatus: IssueFilter
  valueStatus: IssueFilter
  variantStatus: '' | VariantRefStatus
}

/**
 * 配置项状态：任一配置值有待处理引用 → 待处理，否则正常。
 * 配置值状态：任一关联变体失效或歧义 → 待处理；无关联变体不视为异常。
 * 关联变体状态：正常 / 失效 / 歧义，直接取引用解析状态。
 * 配置值级条件按 AND 组合，配置项只在仍有匹配配置值时保留。
 */
export function filterConfigurationRows(
  rows: ConfigurationRow[],
  filters: ConfigurationFilters,
): ConfigurationRow[] {
  let result = rows
  if (filters.configKey) {
    result = result.filter((row) => row.config_key === filters.configKey)
  }
  if (filters.itemStatus) {
    result = result.filter((row) =>
      filters.itemStatus === 'normal' ? row.issueCount === 0 : row.issueCount > 0,
    )
  }

  const hasValueFilters = Boolean(
    filters.vehicle || filters.valueStatus || filters.variantStatus,
  )
  if (!hasValueFilters) return result

  return result.flatMap((row) => {
    const values = row.values.filter((value) => {
      if (filters.vehicle && !value.resolved.vehicles.includes(filters.vehicle)) return false
      if (filters.valueStatus === 'normal' && value.resolved.hasIssue) return false
      if (filters.valueStatus === 'issue' && !value.resolved.hasIssue) return false
      if (
        filters.variantStatus &&
        !value.resolved.refs.some((ref) => ref.status === filters.variantStatus)
      ) {
        return false
      }
      return true
    })
    if (!values.length) return []
    return [{ ...row, values, valueCount: values.length }]
  })
}
