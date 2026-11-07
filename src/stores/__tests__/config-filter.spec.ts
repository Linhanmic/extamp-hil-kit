import { describe, expect, it } from 'vitest'
import type { ConfigurationRow, ConfigurationValueRow, VariantRefStatus } from '../configs'
import { filterConfigurationRows, type ConfigurationFilters } from '../config-filter'

function value(valueName: string, statuses: VariantRefStatus[], vehicles: string[] = []): ConfigurationValueRow {
  return {
    config_key: '媒体音源默认值',
    value: valueName,
    relay_variants: [],
    special_vehicles: [],
    resolved: {
      vehicles,
      variantVehicles: [],
      specialRules: [],
      hasIssue: statuses.some((status) => status !== 'ok'),
      refs: statuses.map((status, index) => ({
        requirement_name: `需求${index}`,
        variant_key: String(index),
        label: `变体${index}`,
        status,
        vehicles: [],
      })),
    },
  }
}

const ROWS: ConfigurationRow[] = [
  {
    config_key: '正常配置项',
    values: [value('正常值', ['ok'], ['HFAF'])],
    valueCount: 1,
    vehicleCount: 1,
    issueCount: 0,
  },
  {
    config_key: '异常配置项',
    values: [value('失效值', ['missing'], ['HCHE']), value('歧义值', ['ambiguous'])],
    valueCount: 2,
    vehicleCount: 1,
    issueCount: 2,
  },
]

function filters(patch: Partial<ConfigurationFilters>): ConfigurationFilters {
  return {
    configKey: '',
    vehicle: '',
    itemStatus: '',
    valueStatus: '',
    variantStatus: '',
    ...patch,
  }
}

describe('filterConfigurationRows', () => {
  it('配置项状态按是否含待处理配置值筛选', () => {
    expect(filterConfigurationRows(ROWS, filters({ itemStatus: 'normal' })).map((row) => row.config_key)).toEqual([
      '正常配置项',
    ])
    expect(filterConfigurationRows(ROWS, filters({ itemStatus: 'issue' })).map((row) => row.config_key)).toEqual([
      '异常配置项',
    ])
  })

  it('配置值状态筛选保留匹配值并更新数量', () => {
    const rows = filterConfigurationRows(ROWS, filters({ valueStatus: 'normal' }))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.values.map((item) => item.value)).toEqual(['正常值'])
    expect(rows[0]?.valueCount).toBe(1)
  })

  it('关联变体按正常、失效、歧义筛选', () => {
    expect(filterConfigurationRows(ROWS, filters({ variantStatus: 'ok' }))[0]?.values[0]?.value).toBe(
      '正常值',
    )
    expect(
      filterConfigurationRows(ROWS, filters({ variantStatus: 'missing' }))[0]?.values[0]?.value,
    ).toBe('失效值')
    expect(
      filterConfigurationRows(ROWS, filters({ variantStatus: 'ambiguous' }))[0]?.values[0]?.value,
    ).toBe('歧义值')
  })

  it('车型与变体状态按 AND 组合', () => {
    expect(
      filterConfigurationRows(ROWS, filters({ vehicle: 'HCHE', variantStatus: 'ok' })),
    ).toEqual([])
    expect(
      filterConfigurationRows(ROWS, filters({ vehicle: 'HCHE', variantStatus: 'missing' }))[0]
        ?.values[0]?.value,
    ).toBe('失效值')
  })

  it('无关联变体的配置值不属于变体异常', () => {
    const rows = filterConfigurationRows(ROWS, filters({ variantStatus: 'missing' }))
    expect(rows[0]?.values.every((item) => item.resolved.refs.length > 0)).toBe(true)
  })
})
