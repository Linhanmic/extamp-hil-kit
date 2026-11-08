import { describe, expect, it } from 'vitest'
import { toProjectRelativePath } from '../project-path'

describe('toProjectRelativePath', () => {
  it('项目内绝对路径转成相对写法', () => {
    expect(
      toProjectRelativePath('E:\\WorkSpaces\\HIL', 'E:\\WorkSpaces\\HIL\\config\\扬声器快照\\snapshot.ini'),
    ).toBe('config/扬声器快照/snapshot.ini')
  })

  it('项目外路径与空值保留原值', () => {
    expect(toProjectRelativePath('E:\\WorkSpaces\\HIL', 'D:\\other\\a.cpt')).toBe(
      'D:\\other\\a.cpt',
    )
    expect(toProjectRelativePath('', 'D:\\a.cpt')).toBe('D:\\a.cpt')
  })
})
