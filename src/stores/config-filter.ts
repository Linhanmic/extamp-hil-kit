import type { ConfigurationRow, ConfigurationStatus, VariantRefStatus } from './configs'

export type ConfigurationStatusFilter = '' | ConfigurationStatus

export interface ConfigurationFilters {
  configKey: string
  vehicle: string
  itemStatus: ConfigurationStatusFilter
  valueStatus: ConfigurationStatusFilter
  variantStatus: '' | VariantRefStatus
}

/**
 * 配置项 / 配置值：正常、浮空、异常；关联变体：正常、失效。
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
    result = result.filter((row) => row.status === filters.itemStatus)
  }

  const hasValueFilters = Boolean(
    filters.vehicle || filters.valueStatus || filters.variantStatus,
  )
  if (!hasValueFilters) return result

  return result.flatMap((row) => {
    const values = row.values.filter((value) => {
      if (filters.vehicle && !value.resolved.vehicles.includes(filters.vehicle)) return false
      if (filters.valueStatus && value.resolved.status !== filters.valueStatus) return false
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
