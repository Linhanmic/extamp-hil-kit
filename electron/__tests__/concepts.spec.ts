import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { generateConceptFile } from '../concepts'
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
  it('未配置生成目录时写入 specs', () => {
    const project = temporaryProject()
    const outcome = generateConceptFile(project, 'SC6H.cpt', '# 场景\n* step1\n')

    expect(outcome.saved?.filePath).toBe(join(project, 'specs', 'SC6H.cpt'))
    expect(readFileSync(join(project, 'specs', 'SC6H.cpt'), 'utf8')).toContain('step1')
  })

  it('按设置中的相对目录生成，拒绝非法文件名和空内容', () => {
    const project = temporaryProject()
    writeSettings(project, { ...DEFAULT_PROJECT_SETTINGS, conceptOutputDir: 'generated/cpt' })

    const outcome = generateConceptFile(project, 'YU2.cpt', '# 场景\n* step1\n')
    expect(outcome.saved?.filePath).toBe(join(project, 'generated', 'cpt', 'YU2.cpt'))

    expect(generateConceptFile(project, '../escape.cpt', '# x\n').error).toMatch(/文件名不正确/)
    expect(generateConceptFile(project, 'empty.cpt', '  ').error).toMatch(/内容不能为空/)
  })
})
