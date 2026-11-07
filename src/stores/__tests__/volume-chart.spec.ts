import { describe, expect, it } from 'vitest'
import { buildVolumeCurves, canonicalVolumeValues } from '../volume-chart'

describe('canonicalVolumeValues', () => {
  it('按 0-39 对齐并补空，已有空 dB 显示为 -', () => {
    const values = canonicalVolumeValues(
      { vehicle: 'A', source: '媒体音', values: ['-99', '', '-64'] },
      ['0', '1', '2'],
    )
    expect(values).toHaveLength(40)
    expect(values.slice(0, 4)).toEqual(['-99', '-', '-64', '-'])
    expect(values[39]).toBe('-')
  })
})

describe('buildVolumeCurves', () => {
  it('相同曲线合并车型，空 dB 在曲线中保留为断点', () => {
    const curves = buildVolumeCurves(
      [
        { vehicle: 'A', source: '媒体音', values: ['-99', '-78'] },
        { vehicle: 'B', source: '媒体音', values: ['-99', '-78'] },
        { vehicle: 'C', source: '媒体音', values: ['-99', ''] },
      ],
      ['0', '1'],
    )
    expect(curves).toHaveLength(2)
    expect(curves[0]?.label).toBe('A/B')
    expect(curves[0]?.values.slice(0, 3)).toEqual([-99, -78, null])
    expect(curves[1]?.values.slice(0, 3)).toEqual([-99, null, null])
  })
})
