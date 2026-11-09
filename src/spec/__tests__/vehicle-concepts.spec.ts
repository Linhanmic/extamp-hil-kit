import { describe, expect, it } from 'vitest'
import { mergeVehicleConcepts } from '../vehicle-concepts'
import type { Concept } from '../concept-file'

function concept(heading: string, step = 'step'): Concept {
  return { heading, params: [], steps: [{ text: step, table: null }] }
}

describe('mergeVehicleConcepts', () => {
  it('车型项替换同名默认项，保持默认项的位置', () => {
    const merged = mergeVehicleConcepts(
      [concept('A', 'd1'), concept('B', 'd2')],
      [concept('A', 'v1'), concept('C', 'v2')],
    )

    expect(merged.concepts.map((item) => item.heading)).toEqual(['A', 'B', 'C'])
    expect(merged.concepts[0]?.steps[0]?.text).toBe('v1')
    expect(merged.replaced).toEqual(['A'])
    expect(merged.appended).toEqual(['C'])
    expect(merged.conflicts).toEqual([])
  })

  it('没有车型差异时原样返回默认项', () => {
    const merged = mergeVehicleConcepts([concept('A'), concept('B')], [])
    expect(merged.concepts.map((item) => item.heading)).toEqual(['A', 'B'])
    expect(merged.replaced).toEqual([])
  })

  it('同类内部标题重复时后者覆盖前者并记进冲突', () => {
    const merged = mergeVehicleConcepts(
      [concept('A', 'first'), concept('A', 'second')],
      [concept('A', 'third'), concept('A', 'fourth')],
    )

    expect(merged.concepts).toHaveLength(1)
    expect(merged.concepts[0]?.steps[0]?.text).toBe('fourth')
    expect(merged.replaced).toEqual(['A'])
    expect(merged.conflicts).toEqual(['A'])
  })
})
