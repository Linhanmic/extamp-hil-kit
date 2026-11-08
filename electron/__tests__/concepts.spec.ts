import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { generateConceptFile, generateSlotConceptFile } from '../concepts'
import { writeSettings } from '../settings-store'
import { DEFAULT_PROJECT_SETTINGS } from '../../src/config/settings-defaults'

const temporaryDirs: string[] = []

function temporaryProject() {
  const dir = mkdtempSync(join(tmpdir(), 'hil-concepts-'))
  temporaryDirs.push(dir)
  return dir
}

afterEach(() => {
  while (temporaryDirs.length)
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true })
})

describe('generateConceptFile', () => {
  it('未单独配置时写入默认生成文件', () => {
    const project = temporaryProject()
    const outcome = generateConceptFile(project, 'SC6H.cpt', '# 场景\n* step1\n')

    expect(outcome.saved?.filePath).toBe(join(project, 'specs', 'generated.cpt'))
    expect(readFileSync(join(project, 'specs', 'generated.cpt'), 'utf8')).toContain('step1')
  })

  it('按设置中的目标文件生成，拒绝非法文件名和空内容', () => {
    const project = temporaryProject()
    writeSettings(project, { ...DEFAULT_PROJECT_SETTINGS, conceptOutputPath: 'generated/cpt.cpt' })

    const outcome = generateConceptFile(project, 'YU2.cpt', '# 场景\n* step1\n')
    expect(outcome.saved?.filePath).toBe(join(project, 'generated', 'cpt.cpt'))

    expect(generateConceptFile(project, '../escape.cpt', '# x\n').error).toMatch(/文件名不正确/)
    expect(generateConceptFile(project, 'empty.cpt', '  ').error).toMatch(/内容不能为空/)
  })

  it('SLOT cpt 使用独立目标文件', () => {
    const project = temporaryProject()
    writeSettings(project, {
      ...DEFAULT_PROJECT_SETTINGS,
      conceptOutputPath: 'output/cpt.cpt',
      slotConceptOutputPath: 'slot/cpt.cpt',
    })

    const outcome = generateSlotConceptFile(project, 'SC6H-SLOT.cpt', '# 媒体音\n* 打开SLOT1\n')
    expect(outcome.saved?.filePath).toBe(join(project, 'slot', 'cpt.cpt'))
    expect(readFileSync(outcome.saved!.filePath, 'utf8')).toContain('SLOT1')
  })
})
