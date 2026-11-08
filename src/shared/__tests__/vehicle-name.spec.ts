import { describe, expect, it } from 'vitest'
import { normalizeVehicleList, normalizeVehicleName } from '../vehicle-name'

describe('车型名归一化', () => {
  it('删除所有空白字符并把破折号改为下划线', () => {
    expect(normalizeVehicleName(' FASLF 带华为智驾 ')).toBe('FASLF带华为智驾')
    expect(normalizeVehicleName('SFHAZ-18CH')).toBe('SFHAZ_18CH')
    expect(normalizeVehicleName('A\nB\tC')).toBe('ABC')
  })

  it('多车型字符串按分隔符拆分归一化', () => {
    expect(normalizeVehicleList('SC6H / HT-FDLK、YU2')).toEqual(['SC6H', 'HT_FDLK', 'YU2'])
  })
})
