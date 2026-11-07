import { describe, expect, it } from 'vitest'
import type {
  ConfigurationRow,
  ConfigurationStatus,
  ConfigurationValueRow,
} from '../configs'
import { filterConfigurationRows, type ConfigurationFilters } from '../config-filter'

function value(
  valueName: string,
  status: ConfigurationStatus,
  options: { missing?: boolean; vehicles?: string[] } = {},
): ConfigurationValueRow {
  return {
    config_key: '媒体音源默认值',
    value: valueName,
    relay_variants: [],
    special_vehicles: status === 'normal' && !options.missing ? [{ match: 'contains', text: 'HF' }] : [],
    resolved: {
      vehicles: options.vehicles ?? [],
      variantVehicles: [],
      specialRules: [],
      status,
      refs: [
        {
          requirement_name: '需求',
          variant_key: 'v',
          label: '变体',
          status: options.missing ? 'missing' : 'ok',
          vehicles: [],
        },
      ],
    },
  }
}

const ROWS: ConfigurationRow[] = [
  {
    config_key: '正常配置项',
    values: [value('正常值', 'normal', { vehicles: ['HFAF'] })],
    valueCount: 1,
    vehicleCount: 1,
    status: 'normal',
  },
  {
    config_key: '浮空配置项',
    values: [value('浮空值', 'floating')],
    valueCount: 1,
    vehicleCount: 0,
    status: 'floating',
  },
  {
    config_key: '异常配置项',
    values: [value('失效值', 'error', { missing: true, vehicles: ['HCHE'] })],
    valueCount: 1,
    vehicleCount: 1,
    status: 'error',
  },
  { config_key: '空配置项', values: [], valueCount: 0, vehicleCount: 0, status: 'floating' },
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
  it('配置项按正常、浮空、异常筛选，空配置项属于浮空', () => {
    expect(filterConfigurationRows(ROWS, filters({ itemStatus: 'normal' })).map((row) => row.config_key)).toEqual([
      '正常配置项',
    ])
    expect(filterConfigurationRows(ROWS, filters({ itemStatus: 'floating' })).map((row) => row.config_key)).toEqual([
      '浮空配置项',
      '空配置项',
    ])
    expect(filterConfigurationRows(ROWS, filters({ itemStatus: 'error' })).map((row) => row.config_key)).toEqual([
      '异常配置项',
    ])
  })

  it('配置值按正常、浮空、异常筛选', () => {
    for (const status of ['normal', 'floating', 'error'] as const) {
      const rows = filterConfigurationRows(ROWS, filters({ valueStatus: status }))
      expect(rows.every((row) => row.values.every((item) => item.resolved.status === status))).toBe(
        true,
      )
    }
  })

  it('关联变体只按正常与失效筛选', () => {
    expect(filterConfigurationRows(ROWS, filters({ variantStatus: 'ok' })).flatMap((row) => row.values).length).toBe(
      2,
    )
    expect(
      filterConfigurationRows(ROWS, filters({ variantStatus: 'missing' }))[0]?.values[0]?.value,
    ).toBe('失效值')
  })

  it('车型与配置值状态按 AND 组合', () => {
    expect(filterConfigurationRows(ROWS, filters({ vehicle: 'HCHE', valueStatus: 'normal' }))).toEqual(
      [],
    )
    expect(
      filterConfigurationRows(ROWS, filters({ vehicle: 'HCHE', valueStatus: 'error' }))[0]
        ?.values[0]?.value,
    ).toBe('失效值')
  })
})
