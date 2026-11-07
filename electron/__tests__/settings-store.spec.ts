import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROJECT_SETTINGS } from '../../src/config/settings-defaults'
import type { ProjectSettings } from '../../src/models/common'
import {
  readSettings,
  resolveProjectPath,
  sanitizeSettings,
  settingsFilePath,
  writeSettings,
} from '../settings-store'

const temporaryDirs: string[] = []

function temporaryProject() {
  const dir = mkdtempSync(join(tmpdir(), 'hil-settings-'))
  temporaryDirs.push(dir)
  return dir
}

afterEach(() => {
  while (temporaryDirs.length)
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true })
})

function sampleSettings(): ProjectSettings {
  return {
    requirementsPath: ' config/关联需求/requirements.json ',
    configsPath: '.hil-kit/config.json',
    snapshotDir: 'config/扬声器快照',
    volumeTablePath: '',
    slotMappingPath: 'config/SLOT映射/mapping.ini',
    requirementsImport: {
      filePath: 'docs/需求分析表.xlsx',
      sheetName: '6、软件需求分析表',
      headerRow: 2,
      idCol: 'a',
      nameCol: 'B',
      detailCol: 'E',
      vehicleStartCol: 'ae',
    },
  }
}

interface StoredPayload {
  schemaVersion: number
  updatedAt: string
  settings: ProjectSettings
}

function readPayload(path: string): StoredPayload {
  return JSON.parse(readFileSync(path, 'utf8')) as StoredPayload
}

describe('readSettings', () => {
  it('文件不存在时带回默认值且不报错', () => {
    const project = temporaryProject()

    const outcome = readSettings(project)

    expect(outcome.error).toBeUndefined()
    expect(outcome.document?.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
    expect(outcome.document?.updatedAt).toBe('')
  })

  it('文件损坏、版本不支持或结构不对时带回默认值并给出原因', () => {
    const project = temporaryProject()
    const target = settingsFilePath(project)
    mkdirSync(join(project, '.hil-kit'), { recursive: true })

    writeFileSync(target, 'not json at all', 'utf8')
    const broken = readSettings(project)
    expect(broken.error).toMatch(/无法解析/)
    expect(broken.document?.settings).toEqual(DEFAULT_PROJECT_SETTINGS)

    writeFileSync(
      target,
      JSON.stringify({ schemaVersion: 2, updatedAt: '', settings: sampleSettings() }),
      'utf8',
    )
    expect(readSettings(project).error).toMatch(/版本 2 不受支持/)

    writeFileSync(
      target,
      JSON.stringify({
        schemaVersion: 1,
        updatedAt: '',
        settings: { ...sampleSettings(), requirementsImport: { headerRow: -1 } },
      }),
      'utf8',
    )
    const invalid = readSettings(project)
    expect(invalid.error).toMatch(/headerRow/)
    expect(invalid.document?.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
  })
})

describe('writeSettings', () => {
  it('写到 .hil-kit/settings.json，路径去空白、列号转大写', () => {
    const project = temporaryProject()

    const saved = writeSettings(project, sampleSettings())

    expect(saved.filePath).toBe(settingsFilePath(project))
    expect(saved.filePath.endsWith(join('.hil-kit', 'settings.json'))).toBe(true)

    const payload = readPayload(saved.filePath)
    expect(Object.keys(payload).sort()).toEqual(['schemaVersion', 'settings', 'updatedAt'])
    expect(payload.schemaVersion).toBe(1)
    expect(payload.updatedAt).toBe(saved.updatedAt)
    expect(payload.settings.requirementsPath).toBe('config/关联需求/requirements.json')
    expect(payload.settings.requirementsImport.idCol).toBe('A')
    expect(payload.settings.requirementsImport.vehicleStartCol).toBe('AE')
    expect(payload.settings.requirementsImport.headerRow).toBe(2)

    // 读回与写入一致
    expect(readSettings(project).document?.settings).toEqual(payload.settings)
  })

  it('每次都刷新 updatedAt', async () => {
    const project = temporaryProject()
    const first = writeSettings(project, sampleSettings())
    await new Promise((done) => setTimeout(done, 5))
    const second = writeSettings(project, { ...sampleSettings(), volumeTablePath: 'config/音量表/test.csv' })

    expect(second.updatedAt > first.updatedAt).toBe(true)
    expect(readPayload(second.filePath).settings.volumeTablePath).toBe('config/音量表/test.csv')
  })
})

describe('sanitizeSettings', () => {
  it('空对象按空设置处理，缺省字段补空串 / 0', () => {
    expect(sanitizeSettings({})).toEqual({
      requirementsPath: '',
      configsPath: '',
      snapshotDir: '',
      volumeTablePath: '',
      slotMappingPath: '',
      requirementsImport: {
        filePath: '',
        sheetName: '',
        headerRow: 0,
        idCol: '',
        nameCol: '',
        detailCol: '',
        vehicleStartCol: '',
      },
    })
  })

  it('表头行必须是不小于 0 的整数，列号只能是 1–3 个字母', () => {
    const base = { requirementsImport: { headerRow: 1 } }
    expect(() => sanitizeSettings({ ...base, requirementsImport: { headerRow: -1 } })).toThrow(
      /headerRow/,
    )
    expect(() => sanitizeSettings({ ...base, requirementsImport: { headerRow: 1.5 } })).toThrow(
      /headerRow/,
    )
    expect(() =>
      sanitizeSettings({ ...base, requirementsImport: { headerRow: 1, idCol: 'A1' } }),
    ).toThrow(/idCol/)
    expect(() => sanitizeSettings({ requirementsPath: 123 })).toThrow(/requirementsPath/)
  })

  it('非对象或 requirementsImport 结构不对时拒绝', () => {
    expect(() => sanitizeSettings(null)).toThrow(/结构不正确/)
    expect(() => sanitizeSettings({ requirementsImport: 'x' })).toThrow(/requirementsImport/)
  })
})

describe('resolveProjectPath', () => {
  it('相对路径按项目根解析，绝对路径原样返回', () => {
    const project = temporaryProject()
    const absolute = resolve(project, 'elsewhere/data.json')

    expect(resolveProjectPath(project, 'config/a.json')).toBe(resolve(project, 'config/a.json'))
    expect(resolveProjectPath(project, absolute)).toBe(absolute)
  })

  it('空值回落到 fallback，全空时返回空串', () => {
    const project = temporaryProject()

    expect(resolveProjectPath(project, '  ', '.hil-kit/requirements.json')).toBe(
      resolve(project, '.hil-kit/requirements.json'),
    )
    expect(resolveProjectPath(project, '')).toBe('')
  })
})
