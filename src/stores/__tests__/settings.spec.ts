import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '../settings'
import { DEFAULT_PROJECT_SETTINGS } from '@/config/settings-defaults'
import type { DesktopBridge } from '@/types/desktop'
import type { ProjectSettings } from '@/models'

function sampleSettings(): ProjectSettings {
  return {
    requirementsPath: 'config/关联需求/requirements.json',
    configsPath: '.hil-kit/config.json',
    outputPath: 'config/出声位置/出声位置.txt',
    snapshotPath: 'config/扬声器快照/snapshot.ini',
    volumeTablePath: '',
    slotMappingPath: 'config/SLOT映射/mapping.ini',
    conceptOutputPath: 'specs/generated.cpt',
    slotConceptOutputPath: 'specs/slot-generated.cpt',
    gaugeExecutable: '',
    gaugeArgs: '',
    requirementsImport: {
      filePath: '',
      sheetName: '6、软件需求分析表',
      headerRow: 2,
      idCol: 'A',
      nameCol: 'B',
      detailCol: 'E',
      vehicleStartCol: 'G',
    },
  }
}

/** 装一个会记住设置的主进程桥，并记录需求 / 配置数据被重读的次数 */
function installBridge(options: { settings?: ProjectSettings | null; saveError?: string } = {}) {
  let stored =
    options.settings === undefined || options.settings === null
      ? null
      : { schemaVersion: 1, updatedAt: '2026-11-08T06:12:00.000Z', settings: options.settings }

  const load = vi.fn<DesktopBridge['settings']['load']>(async () => ({
    document: stored
      ? (structuredClone(stored) as never)
      : {
          schemaVersion: 1,
          updatedAt: '',
          settings: structuredClone(DEFAULT_PROJECT_SETTINGS),
        },
  }))
  const save = vi.fn<DesktopBridge['settings']['save']>(async (settings: ProjectSettings) => {
    if (options.saveError) return { error: options.saveError }
    stored = {
      schemaVersion: 1,
      updatedAt: '2026-11-08T07:00:00.000Z',
      settings: structuredClone(settings),
    }
    return {
      saved: { filePath: '/project/.hil-kit/settings.json', updatedAt: stored.updatedAt },
    }
  })
  const requirementsLoad = vi.fn<DesktopBridge['requirements']['load']>(async () => ({ empty: true }))
  const configsLoad = vi.fn<DesktopBridge['configs']['load']>(async () => ({ empty: true }))

  window.desktop = {
    settings: {
      load,
      save,
      pickFile: vi.fn<DesktopBridge['settings']['pickFile']>(async () => ({ canceled: true })),
      pickDirectory: vi.fn<DesktopBridge['settings']['pickDirectory']>(async () => ({
        canceled: true,
      })),
    },
    requirements: { load: requirementsLoad },
    configs: { load: configsLoad },
  } as unknown as DesktopBridge

  return { load, save, requirementsLoad, configsLoad }
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.desktop = undefined
})

describe('useSettingsStore', () => {
  it('读取设置；文件不存在时用默认值', async () => {
    installBridge()
    const store = useSettingsStore()

    await store.load()

    expect(store.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
    expect(store.updatedAt).toBe('')
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
  })

  it('读取已保存的设置', async () => {
    installBridge({ settings: sampleSettings() })
    const store = useSettingsStore()

    await store.load()

    expect(store.settings.requirementsPath).toBe('config/关联需求/requirements.json')
    expect(store.settings.requirementsImport.headerRow).toBe(2)
    expect(store.updatedAt).toBe('2026-11-08T06:12:00.000Z')
  })

  it('保存后写回并让需求与配置参数按新路径重读', async () => {
    const bridge = installBridge({ settings: sampleSettings() })
    const store = useSettingsStore()
    await store.load()

    const next = { ...sampleSettings(), volumeTablePath: 'config/音量表/test.csv' }
    const result = await store.save(next)

    expect(result.ok).toBe(true)
    expect(bridge.save).toHaveBeenCalledTimes(1)
    // 保存后重新读设置，并以盘上的数据为准
    expect(store.settings.volumeTablePath).toBe('config/音量表/test.csv')
    expect(store.updatedAt).toBe('2026-11-08T07:00:00.000Z')
    expect(bridge.requirementsLoad).toHaveBeenCalledTimes(1)
    expect(bridge.configsLoad).toHaveBeenCalledTimes(1)
  })

  it('保存失败时保留原设置并给出错误', async () => {
    installBridge({ settings: sampleSettings(), saveError: '设置项 idCol 不是有效的列号：A1' })
    const store = useSettingsStore()
    await store.load()

    const result = await store.save(sampleSettings())

    expect(result).toMatchObject({ ok: false, error: '设置项 idCol 不是有效的列号：A1' })
    expect(store.error).toBe('设置项 idCol 不是有效的列号：A1')
    expect(store.settings.requirementsImport.sheetName).toBe('6、软件需求分析表')
  })

  it('切换项目时 clear 会回到默认设置', async () => {
    installBridge({ settings: sampleSettings() })
    const store = useSettingsStore()
    await store.load()

    store.clear()

    expect(store.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
    expect(store.loaded).toBe(false)
  })

  it('浏览器里没有桥接时不报错，用默认设置', async () => {
    const store = useSettingsStore()

    await store.load()

    expect(store.settings).toEqual(DEFAULT_PROJECT_SETTINGS)
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
  })
})
