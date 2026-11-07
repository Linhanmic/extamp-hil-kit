import { describe, expect, it } from 'vitest'
import { buildSpecTree, specCheckState, specFilePaths } from '../tree'

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

  it('目录按后代文件计算级联三态', () => {
    const tree = buildSpecTree([
      { name: 'nested/a.spec', path: '/specs/nested/a.spec' },
      { name: 'nested/b.spec', path: '/specs/nested/b.spec' },
      { name: 'root.spec', path: '/specs/root.spec' },
    ])
    const nested = tree[0]!
    expect(specFilePaths(nested)).toEqual(['/specs/nested/a.spec', '/specs/nested/b.spec'])
    expect(specCheckState(nested, new Set())).toBe('unchecked')
    expect(specCheckState(nested, new Set(['/specs/nested/a.spec']))).toBe('indeterminate')
    expect(
      specCheckState(nested, new Set(['/specs/nested/a.spec', '/specs/nested/b.spec'])),
    ).toBe('checked')
  })
})
