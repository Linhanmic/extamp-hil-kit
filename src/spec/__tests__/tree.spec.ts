import { describe, expect, it } from 'vitest'
import { buildSpecTree, specDisplayName } from '../tree'

describe('buildSpecTree', () => {
  it('从 specs 下一层构建层级，目录优先，空目录不出现', () => {
    const tree = buildSpecTree([
      { name: 'nested/deep/b.spec', path: '/specs/nested/deep/b.spec' },
      { name: 'a.spec', path: '/specs/a.spec' },
      { name: 'nested/c.spec', path: '/specs/nested/c.spec' },
    ])

    expect(tree.map((node) => node.name)).toEqual(['nested', 'a.spec'])
    expect(tree[0]?.children.map((node) => node.name)).toEqual(['deep', 'c.spec'])
    expect(tree[0]?.children[0]?.children[0]).toMatchObject({
      type: 'file',
      name: 'b.spec',
      path: '/specs/nested/deep/b.spec',
    })
  })

  it('文件名显示不带 spec 后缀', () => {
    expect(specDisplayName('example.spec')).toBe('example')
    expect(specDisplayName('example.SPEC')).toBe('example')
  })
})
