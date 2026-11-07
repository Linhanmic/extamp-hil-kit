import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Configuration } from '../../src/models/common'
import {
  configsFilePath,
  normalizeConfigurations,
  readConfigs,
  writeConfigs,
} from '../config-store'

const temporaryDirs: string[] = []

function temporaryProject() {
  const dir = mkdtempSync(join(tmpdir(), 'hil-configs-'))
  temporaryDirs.push(dir)
  return dir
}

afterEach(() => {
  while (temporaryDirs.length)
    rmSync(temporaryDirs.pop() as string, { recursive: true, force: true })
})

function sampleConfigurations(): Configuration[] {
  return [
    {
      config_key: '扬声器配置',
      config_value: [
        {
          config_key: '扬声器配置',
          value: '14扬声器',
          relay_variants: [{ requirement_name: '功放握手', variant_key: '变体1' }],
          vehicles: [],
        },
        {
          config_key: '扬声器配置',
          value: '10扬声器',
          relay_variants: [],
          vehicles: ['SC6H', 'YU2'],
        },
      ],
    },
    {
      config_key: '功放型号',
      config_value: [
        {
          config_key: '功放型号',
          value: 'AMP-A',
          relay_variants: [{ requirement_name: '功放握手', variant_key: '' }],
          vehicles: [],
        },
      ],
    },
  ]
}

interface StoredPayload {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  configurations: {
    config_key: string
    config_value: { value: string; relay_variants: unknown[]; vehicles: string[] }[]
  }[]
}

function readPayload(path: string): StoredPayload {
  return JSON.parse(readFileSync(path, 'utf8')) as StoredPayload
}

describe('writeConfigs', () => {
  it('写到项目目录的 .hil-kit/config.json，配置值不写 config_key', () => {
    const project = temporaryProject()

    const saved = writeConfigs(project, sampleConfigurations())

    expect(saved.filePath).toBe(configsFilePath(project))
    expect(saved.filePath.endsWith(join('.hil-kit', 'config.json'))).toBe(true)
    expect(saved.createdAt).toBe(saved.updatedAt)
    expect(saved.configurationCount).toBe(2)
    expect(saved.configValueCount).toBe(3)

    const payload = readPayload(saved.filePath)
    expect(Object.keys(payload).sort()).toEqual([
      'configurations',
      'createdAt',
      'schemaVersion',
      'updatedAt',
    ])
    expect(payload.schemaVersion).toBe(1)
    expect(payload.configurations).toHaveLength(2)
    // 归属由所在配置项确定，配置值不重复存 config_key
    expect(Object.keys(payload.configurations[0]!.config_value[0]!).sort()).toEqual([
      'relay_variants',
      'value',
      'vehicles',
    ])
    expect(payload.configurations[0]!.config_value[1]!.vehicles).toEqual(['SC6H', 'YU2'])
  })

  it('再次保存是更新：保留 createdAt，刷新 updatedAt，配置整体替换', () => {
    const project = temporaryProject()
    const first = writeConfigs(project, sampleConfigurations())

    const stored = readPayload(first.filePath)
    stored.createdAt = '2020-01-01T00:00:00.000Z'
    stored.updatedAt = '2020-01-01T00:00:00.000Z'
    stored.configurations = [{ config_key: '旧配置项', config_value: [] }]
    writeFileSync(first.filePath, JSON.stringify(stored, null, 2), 'utf8')

    const second = writeConfigs(project, sampleConfigurations())
    const payload = readPayload(first.filePath)

    expect(second.createdAt).toBe('2020-01-01T00:00:00.000Z')
    expect(second.updatedAt > second.createdAt).toBe(true)
    expect(payload.createdAt).toBe('2020-01-01T00:00:00.000Z')
    expect(payload.configurations.map((item) => item.config_key)).toEqual([
      '扬声器配置',
      '功放型号',
    ])
  })

  it('已有文件无法解析时按首次保存重新写 createdAt', () => {
    const project = temporaryProject()
    const target = configsFilePath(project)
    mkdirSync(join(project, '.hil-kit'), { recursive: true })
    writeFileSync(target, 'not json at all', 'utf8')

    const saved = writeConfigs(project, sampleConfigurations())

    expect(saved.createdAt).toBe(saved.updatedAt)
    expect(readPayload(target).schemaVersion).toBe(1)
  })
})

describe('readConfigs', () => {
  it('读回时按所属配置项补齐配置值的 config_key', () => {
    const project = temporaryProject()
    const saved = writeConfigs(project, sampleConfigurations())

    const outcome = readConfigs(project)

    expect(outcome.error).toBeUndefined()
    expect(outcome.empty).toBeUndefined()
    expect(outcome.document).toMatchObject({
      schemaVersion: 1,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    })
    const configurations = outcome.document?.configurations ?? []
    expect(configurations.map((item) => item.config_key)).toEqual(['扬声器配置', '功放型号'])
    expect(configurations[0]?.config_value.map((value) => value.config_key)).toEqual([
      '扬声器配置',
      '扬声器配置',
    ])
    expect(configurations[1]?.config_value[0]).toEqual({
      config_key: '功放型号',
      value: 'AMP-A',
      relay_variants: [{ requirement_name: '功放握手', variant_key: '' }],
      vehicles: [],
    })
  })

  it('文件不存在时按「还没维护」处理', () => {
    expect(readConfigs(temporaryProject())).toEqual({ empty: true })
  })

  it('文件损坏、版本不支持或结构不对时给出错误而不是半份数据', () => {
    const project = temporaryProject()
    const target = configsFilePath(project)
    mkdirSync(join(project, '.hil-kit'), { recursive: true })

    writeFileSync(target, 'not json at all', 'utf8')
    expect(readConfigs(project).error).toMatch(/无法解析/)

    writeFileSync(
      target,
      JSON.stringify({ schemaVersion: 2, createdAt: 'x', updatedAt: 'y', configurations: [] }),
      'utf8',
    )
    expect(readConfigs(project).error).toMatch(/版本 2 不受支持/)

    writeFileSync(
      target,
      JSON.stringify({
        schemaVersion: 1,
        createdAt: 'x',
        updatedAt: 'y',
        configurations: [{ config_key: '功放型号', config_value: [{ value: 'AMP-A' }] }],
      }),
      'utf8',
    )
    expect(readConfigs(project).error).toMatch(/结构不正确/)
  })
})

describe('normalizeConfigurations', () => {
  it('去首尾空白，车型与变体引用去重去空', () => {
    const normalized = normalizeConfigurations([
      {
        config_key: ' 扬声器配置 ',
        config_value: [
          {
            config_key: '扬声器配置',
            value: ' 14扬声器 ',
            relay_variants: [
              { requirement_name: ' 功放握手 ', variant_key: '变体1' },
              { requirement_name: '功放握手', variant_key: '变体1' },
            ],
            vehicles: ['SC6H', ' SC6H ', '', 'YU2'],
          },
        ],
      },
    ])

    expect(normalized[0]?.config_key).toBe('扬声器配置')
    expect(normalized[0]?.config_value[0]?.value).toBe('14扬声器')
    expect(normalized[0]?.config_value[0]?.relay_variants).toEqual([
      { requirement_name: '功放握手', variant_key: '变体1' },
    ])
    expect(normalized[0]?.config_value[0]?.vehicles).toEqual(['SC6H', 'YU2'])
    // 配置值的 config_key 跟着配置项走
    expect(normalized[0]?.config_value[0]?.config_key).toBe('扬声器配置')
  })

  it('空配置项、重复配置项、空配置值、重复配置值、空需求名称都拒绝', () => {
    const configuration = (key: string, value: string, requirementName = '功放握手') =>
      ({
        config_key: key,
        config_value: [
          {
            config_key: key,
            value,
            relay_variants: [{ requirement_name: requirementName, variant_key: '' }],
            vehicles: [],
          },
        ],
      }) satisfies Configuration

    expect(() => normalizeConfigurations([configuration('  ', 'v')])).toThrow(/名称不能为空/)
    expect(() =>
      normalizeConfigurations([configuration('甲', 'v'), configuration(' 甲 ', 'v2')]),
    ).toThrow(/配置项「甲」重复/)
    expect(() => normalizeConfigurations([configuration('甲', '  ')])).toThrow(/空的配置值/)
    expect(() =>
      normalizeConfigurations([configuration('甲', 'v'), configuration('乙', ' v ')]),
    ).not.toThrow()
    expect(() =>
      normalizeConfigurations([
        {
          config_key: '甲',
          config_value: [
            { config_key: '甲', value: 'v', relay_variants: [], vehicles: [] },
            { config_key: '甲', value: ' v ', relay_variants: [], vehicles: [] },
          ],
        },
      ]),
    ).toThrow(/配置值「v」重复/)
    expect(() => normalizeConfigurations([configuration('甲', 'v', '  ')])).toThrow(
      /没有需求名称的变体引用/,
    )
  })
})
