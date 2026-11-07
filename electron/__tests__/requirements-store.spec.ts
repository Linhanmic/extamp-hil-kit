import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { RequirementsParseConfig } from '../../src/models/common'
import { parseRequirements, probeSheet } from '../requirements-parse'
import { readSheetTable } from '../requirements-sheet'
import { requirementsFilePath, writeRequirements } from '../requirements-store'

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

function sampleConfig(): RequirementsParseConfig {
  const probe = probeSheet(readSheetTable(SAMPLE_FILE, SAMPLE_SHEET)).probe!
  return {
    filePath: SAMPLE_FILE,
    sheetName: SAMPLE_SHEET,
    ...probe.mapping,
  }
}

describe('writeRequirements', () => {
  it('写到项目目录的 .hil-kit/requirements.json 并返回摘要', () => {
    const project = temporaryProject()
    const config = sampleConfig()
    const result = parseRequirements(readSheetTable(config.filePath, config.sheetName), config)

    const saved = writeRequirements(project, config, result)

    expect(saved.filePath).toBe(requirementsFilePath(project))
    expect(saved.filePath.endsWith(join('.hil-kit', 'requirements.json'))).toBe(true)
    expect(saved.requirementCount).toBe(4)
    expect(saved.variantCount).toBe(result.stats.variantCount)

    const payload = JSON.parse(readFileSync(saved.filePath, 'utf8')) as {
      version: number
      importedAt: string
      source: RequirementsParseConfig
      vehicles: string[]
      requirements: unknown[]
    }
    expect(payload.version).toBe(1)
    expect(payload.importedAt).toBe(saved.importedAt)
    expect(payload.source).toMatchObject({
      sheetName: SAMPLE_SHEET,
      headerRow: 2,
      detailCol: 'E',
      vehicleStartCol: 'G',
    })
    expect(payload.vehicles).toHaveLength(25)
    expect(payload.requirements).toHaveLength(4)
  })
})
