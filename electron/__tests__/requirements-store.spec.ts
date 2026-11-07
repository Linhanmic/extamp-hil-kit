import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { RequirementsParseResult } from '../../src/models/common'
import { parseRequirements, probeSheet } from '../requirements-parse'
import { readSheetTable } from '../requirements-sheet'
import { readRequirements, requirementsFilePath, writeRequirements } from '../requirements-store'

const SAMPLE_FILE = resolve('testdatas/需求分析表.xlsx')
const SAMPLE_SHEET = '6、软件需求分析表'

const temporaryDirs: string[] = []

function temporaryProject() {
  const dir = mkdtempSync(join(tmpdir(), 'hil-requirements-'))
  temporaryDirs.push(dir)
  return dir
}

afterEach(() => {
  while (temporaryDirs.length)
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true })
})

function parsedSample(): RequirementsParseResult {
  const table = readSheetTable(SAMPLE_FILE, SAMPLE_SHEET)
  return parseRequirements(table, probeSheet(table).probe!.mapping)
}

interface StoredPayload {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  requirements: { id: string; variants: unknown[] }[]
}

function readPayload(path: string): StoredPayload {
  return JSON.parse(readFileSync(path, 'utf8')) as StoredPayload
}

describe('writeRequirements', () => {
  it('写到项目目录的 .hil-kit/requirements.json，只有结构版本、时间与需求数据', () => {
    const project = temporaryProject()
    const result = parsedSample()

    const saved = writeRequirements(project, result)

    expect(saved.filePath).toBe(requirementsFilePath(project))
    expect(saved.filePath.endsWith(join('.hil-kit', 'requirements.json'))).toBe(true)
    expect(saved.createdAt).toBe(saved.updatedAt)
    expect(saved.requirementCount).toBe(4)
    expect(saved.variantCount).toBe(68)

    const payload = readPayload(saved.filePath)
    // 车型全集、来源路径、列配置都不落盘：车型可从变体汇总
    expect(Object.keys(payload).sort()).toEqual([
      'createdAt',
      'requirements',
      'schemaVersion',
      'updatedAt',
    ])
    expect(payload.schemaVersion).toBe(1)
    expect(payload.createdAt).toBe(saved.createdAt)
    expect(payload.updatedAt).toBe(saved.updatedAt)
    expect(payload.requirements).toHaveLength(4)
  })

  it('再次导入是更新：保留 createdAt，刷新 updatedAt，数据整体替换', () => {
    const project = temporaryProject()
    const first = writeRequirements(project, parsedSample())

    // 改写首次导入时间与旧数据，模拟「上次导入是以前、且数据已过期」
    const stored = readPayload(first.filePath)
    stored.createdAt = '2020-01-01T00:00:00.000Z'
    stored.updatedAt = '2020-01-01T00:00:00.000Z'
    stored.requirements = [{ id: 'OLD_REQ', variants: [] }]
    writeFileSync(first.filePath, JSON.stringify(stored, null, 2), 'utf8')

    const second = writeRequirements(project, parsedSample())
    const payload = readPayload(first.filePath)

    expect(second.createdAt).toBe('2020-01-01T00:00:00.000Z')
    expect(second.updatedAt > second.createdAt).toBe(true)
    expect(payload.createdAt).toBe('2020-01-01T00:00:00.000Z')
    expect(payload.updatedAt).toBe(second.updatedAt)
    // 旧数据不残留
    expect(payload.requirements).toHaveLength(4)
    expect(payload.requirements.map((item) => item.id)).not.toContain('OLD_REQ')
  })

  it('已有文件无法解析时按首次导入重新写 createdAt', () => {
    const project = temporaryProject()
    const target = requirementsFilePath(project)
    mkdirSync(join(project, '.hil-kit'), { recursive: true })
    writeFileSync(target, 'not json at all', 'utf8')

    const saved = writeRequirements(project, parsedSample())

    expect(saved.createdAt).toBe(saved.updatedAt)
    expect(readPayload(target).schemaVersion).toBe(1)
  })
})

describe('readRequirements', () => {
  it('读回写入的数据', () => {
    const project = temporaryProject()
    const saved = writeRequirements(project, parsedSample())

    const outcome = readRequirements(project)

    expect(outcome.error).toBeUndefined()
    expect(outcome.empty).toBeUndefined()
    expect(outcome.document).toMatchObject({
      schemaVersion: 1,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    })
    expect(outcome.document?.requirements).toHaveLength(4)
    expect(outcome.document?.requirements[0]?.variants[0]).toMatchObject({
      key: '变体1',
      vehicles: ['HFAF', 'EFSS'],
    })
  })

  it('文件不存在时按「还没导入」处理', () => {
    const project = temporaryProject()

    expect(readRequirements(project)).toEqual({ empty: true })
  })

  it('文件损坏、版本不支持或结构不对时给出错误而不是半份数据', () => {
    const project = temporaryProject()
    const target = requirementsFilePath(project)
    mkdirSync(join(project, '.hil-kit'), { recursive: true })

    writeFileSync(target, 'not json at all', 'utf8')
    expect(readRequirements(project).error).toMatch(/无法解析/)

    writeFileSync(
      target,
      JSON.stringify({ schemaVersion: 2, createdAt: 'x', updatedAt: 'y', requirements: [] }),
      'utf8',
    )
    expect(readRequirements(project).error).toMatch(/版本 2 不受支持/)

    writeFileSync(
      target,
      JSON.stringify({
        schemaVersion: 1,
        createdAt: 'x',
        updatedAt: 'y',
        requirements: [{ id: 'REQ', name: '甲', detail: '乙', variants: [{ key: 'k' }] }],
      }),
      'utf8',
    )
    expect(readRequirements(project).error).toMatch(/结构不正确/)
  })
})


describe('自定义数据文件位置', () => {
  it('按设置里的绝对路径读写需求数据，默认位置不受影响', () => {
    const project = temporaryProject()
    const target = join(temporaryProject(), 'shared', 'requirements.json')

    const saved = writeRequirements(project, parsedSample(), target)

    expect(saved.filePath).toBe(target)
    expect(readRequirements(project, target).document?.requirements).toHaveLength(4)
    expect(readRequirements(project)).toEqual({ empty: true })
  })

  it('相对路径按项目根解析', () => {
    const project = temporaryProject()
    const relative = 'config/关联需求/requirements.json'

    const saved = writeRequirements(project, parsedSample(), relative)

    expect(saved.filePath).toBe(join(project, relative))
    expect(readRequirements(project, relative).document?.requirements).toHaveLength(4)
  })
})