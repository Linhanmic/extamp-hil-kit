import { beforeEach, describe, expect, it } from 'vitest'
import {
  mappingStorageKey,
  readExcludedMappingIds,
  writeExcludedMappingIds,
} from '../requirement-mapping'

describe('需求映射参与状态持久化', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('按项目路径读写不参与映射的需求 ID', () => {
    const project = 'E:/WorkSpaces/HIL'
    expect(readExcludedMappingIds(project).size).toBe(0)

    writeExcludedMappingIds(project, new Set(['REQ_1', 'REQ_2']))
    expect(readExcludedMappingIds(project)).toEqual(new Set(['REQ_1', 'REQ_2']))
    expect(readExcludedMappingIds('E:/other')).toEqual(new Set())
    expect(mappingStorageKey(project)).toContain('extamp-hil-mapping-status:')
  })

  it('损坏的本地数据按空集合处理', () => {
    localStorage.setItem(mappingStorageKey('E:/bad'), '{not-json')
    expect(readExcludedMappingIds('E:/bad').size).toBe(0)
  })
})
