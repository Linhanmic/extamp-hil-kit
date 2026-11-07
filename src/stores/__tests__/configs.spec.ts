import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConfigsStore } from '../configs'
import { useRequirementsStore } from '../requirements'
import type { DesktopBridge } from '@/types/desktop'
import type { ConfigsDocument, Configuration, RequirementsDocument } from '@/models'

const REQUIREMENTS: RequirementsDocument = {
  schemaVersion: 1,
  createdAt: '2026-11-07T05:30:00.000Z',
  updatedAt: '2026-11-07T07:42:00.000Z',
  requirements: [
    {
      id: 'REQ_1',
      name: '功放握手',
      detail: '…',
      variants: [
        { requirement_id: 'REQ_1', key: '', content: [], vehicles: ['HFAF'] },
        { requirement_id: 'REQ_1', key: '变体1', content: ['变体1'], vehicles: ['EFSS'] },
      ],
    },
    {
      id: 'REQ_2',
      name: '音量控制',
      detail: '…',
      variants: [{ requirement_id: 'REQ_2', key: '变体2', content: ['变体2'], vehicles: ['QDWS'] }],
    },
    // 与 REQ_2 同名：按名称引用的配置值会变成歧义
    {
      id: 'REQ_3',
      name: '音量控制',
      detail: '…',
      variants: [{ requirement_id: 'REQ_3', key: '变体2', content: ['变体2'], vehicles: ['HFAF'] }],
    },
  ],
}

function configsDocument(): ConfigsDocument {
  return {
    schemaVersion: 2,
    createdAt: '2026-11-08T02:10:00.000Z',
    updatedAt: '2026-11-08T03:26:00.000Z',
    configurations: [
      {
        config_key: '扬声器配置',
        config_value: [
          {
            config_key: '扬声器配置',
            value: '14扬声器',
            relay_variants: [{ requirement_name: '功放握手', variant_key: '变体1' }],
            special_vehicles: [],
          },
          {
            config_key: '扬声器配置',
            value: '10扬声器',
            relay_variants: [],
            special_vehicles: [{ match: 'starts_with', text: 'HF' }],
          },
          {
            config_key: '扬声器配置',
            value: '8扬声器',
            relay_variants: [
              { requirement_name: '失联需求', variant_key: '' },
              { requirement_name: '音量控制', variant_key: '变体2' },
            ],
            special_vehicles: [{ match: 'contains', text: 'DW' }],
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
            special_vehicles: [],
          },
        ],
      },
    ],
  }
}

/** 装一个会记住盘上内容的主进程桥，save 后 load 能读到新数据 */
function installBridge(options: { document?: ConfigsDocument | null; saveError?: string } = {}) {
  let stored = options.document ?? null

  const load = vi.fn<DesktopBridge['configs']['load']>(async () =>
    stored ? { document: structuredClone(stored) } : { empty: true },
  )
  const save = vi.fn<DesktopBridge['configs']['save']>(async (configurations: Configuration[]) => {
    if (options.saveError) return { error: options.saveError }
    stored = {
      schemaVersion: 2,
      createdAt: stored?.createdAt ?? '2026-11-08T02:10:00.000Z',
      updatedAt: '2026-11-08T04:00:00.000Z',
      configurations: structuredClone(configurations),
    }
    return {
      saved: {
        filePath: '/project/.hil-kit/config.json',
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        configurationCount: configurations.length,
        configValueCount: configurations.reduce((sum, item) => sum + item.config_value.length, 0),
      },
    }
  })
  const requirementsLoad = vi.fn<DesktopBridge['requirements']['load']>(async () => ({
    document: structuredClone(REQUIREMENTS),
  }))

  window.desktop = {
    configs: { load, save },
    requirements: { load: requirementsLoad },
  } as unknown as DesktopBridge

  return { load, save }
}

async function storeWithData(options?: Parameters<typeof installBridge>[0]) {
  const bridge = installBridge(options)
  const requirements = useRequirementsStore()
  await requirements.load()
  const store = useConfigsStore()
  await store.load()
  return { store, bridge, requirements }
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.desktop = undefined
})

describe('useConfigsStore 读取与派生', () => {
  it('读取后汇总配置项、配置值与车型数', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    expect(store.configurationCount).toBe(2)
    expect(store.configValueCount).toBe(4)
    // EFSS / HFAF / QDWS 去重（HF 命中 HFAF，DW 命中 QDWS）
    expect(store.vehicleCount).toBe(3)
    expect(store.hasData).toBe(true)
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
  })

  it('生效车型 = 关联变体车型 ∪ 特殊规则命中的需求车型', async () => {
    const { store } = await storeWithData({ document: configsDocument() })
    const values = store.rows[0]?.values ?? []

    expect(values[0]?.resolved).toMatchObject({
      vehicles: ['EFSS'],
      variantVehicles: ['EFSS'],
      specialRules: [],
      hasIssue: false,
    })
    expect(values[1]?.resolved).toMatchObject({
      vehicles: ['HFAF'],
      variantVehicles: [],
      specialRules: [{ match: 'starts_with', text: 'HF' }],
    })
    expect(values[2]?.resolved).toMatchObject({
      vehicles: ['QDWS'],
      specialRules: [{ match: 'contains', text: 'DW' }],
    })
  })

  it('特殊车型规则按 starts_with / contains 匹配需求车型', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    // 把 10扬声器 的规则改成 contains 'FS'，应命中 EFSS
    const result = await store.updateConfigValue('扬声器配置', '10扬声器', {
      value: '10扬声器',
      relay_variants: [],
      special_vehicles: [{ match: 'contains', text: 'FS' }],
    })
    expect(result.ok).toBe(true)
    expect(
      store.rows[0]?.values.find((value) => value.value === '10扬声器')?.resolved.vehicles,
    ).toEqual(['EFSS'])
  })

  it('引用不到的需求标为失效，同名需求标为歧义，都不参与车型合并', async () => {
    const { store } = await storeWithData({ document: configsDocument() })
    const refs = store.rows[0]?.values[2]?.resolved.refs ?? []

    expect(refs[0]).toMatchObject({ requirement_name: '失联需求', status: 'missing', vehicles: [] })
    expect(refs[1]).toMatchObject({ requirement_name: '音量控制', status: 'ambiguous', vehicles: [] })
    expect(store.rows[0]?.values[2]?.resolved.hasIssue).toBe(true)
    expect(store.rows[0]?.issueCount).toBe(1)
  })

  it('变体标签取变体内容的第一条文本，空内容显示为无变体差异', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    expect(store.rows[0]?.values[0]?.resolved.refs[0]?.label).toBe('变体1')
    expect(store.rows[1]?.values[0]?.resolved.refs[0]?.label).toBe('无变体差异')
  })

  it('车型候选项取需求车型全集', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    expect(store.vehicleOptions).toEqual(['HFAF', 'EFSS', 'QDWS'])
  })

  it('没有配置数据时按空状态处理', async () => {
    const { store } = await storeWithData({ document: null })

    expect(store.hasData).toBe(false)
    expect(store.error).toBe('')
    expect(store.loaded).toBe(true)
  })

  it('文件不可用时保留错误信息，不把半份数据当可信对象', async () => {
    installBridge()
    const store = useConfigsStore()
    window.desktop = {
      configs: {
        load: async () => ({ error: '配置参数结构版本 3 不受支持（当前为 2）' }),
      },
    } as unknown as DesktopBridge

    await store.load()

    expect(store.document).toBeNull()
    expect(store.error).toBe('配置参数结构版本 3 不受支持（当前为 2）')
  })

  it('切换项目时 clear 会清空', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    store.clear()

    expect(store.hasData).toBe(false)
    expect(store.loaded).toBe(false)
  })
})

describe('useConfigsStore 编辑', () => {
  it('新增配置项后整份写回并读回', async () => {
    const { store, bridge } = await storeWithData({ document: configsDocument() })

    const result = await store.addConfiguration(' 功放通道 ')

    expect(result.ok).toBe(true)
    expect(bridge.save).toHaveBeenCalledTimes(1)
    expect(store.rows.map((row) => row.config_key)).toEqual(['扬声器配置', '功放型号', '功放通道'])
    expect(store.rows[2]?.valueCount).toBe(0)
  })

  it('重复配置项、空配置值不会触发保存', async () => {
    const { store, bridge } = await storeWithData({ document: configsDocument() })

    expect(await store.addConfiguration('扬声器配置')).toMatchObject({ ok: false })
    expect(
      await store.addConfigValue('扬声器配置', {
        value: '  ',
        relay_variants: [],
        special_vehicles: [],
      }),
    ).toMatchObject({ ok: false })
    expect(
      await store.addConfigValue('扬声器配置', {
        value: '14扬声器',
        relay_variants: [],
        special_vehicles: [],
      }),
    ).toMatchObject({ ok: false })
    expect(bridge.save).not.toHaveBeenCalled()
  })

  it('保存失败时保留原数据并给出错误', async () => {
    const { store } = await storeWithData({
      document: configsDocument(),
      saveError: '配置项「甲」重复',
    })

    const result = await store.addConfiguration('甲')

    expect(result).toMatchObject({ ok: false, error: '配置项「甲」重复' })
    expect(store.error).toBe('配置项「甲」重复')
    expect(store.rows.map((row) => row.config_key)).toEqual(['扬声器配置', '功放型号'])
  })

  it('修改配置值连同变体引用与特殊车型一起写回', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    const result = await store.updateConfigValue('扬声器配置', '10扬声器', {
      value: '10扬声器（改）',
      relay_variants: [{ requirement_name: '功放握手', variant_key: '变体1' }],
      special_vehicles: [{ match: 'contains', text: 'QD' }],
    })

    expect(result.ok).toBe(true)
    expect(store.rows[0]?.values[1]).toMatchObject({
      value: '10扬声器（改）',
      resolved: {
        vehicles: ['EFSS', 'QDWS'],
        variantVehicles: ['EFSS'],
        specialRules: [{ match: 'contains', text: 'QD' }],
      },
    })
  })

  it('删除配置值与删除配置项都会写回', async () => {
    const { store, bridge } = await storeWithData({ document: configsDocument() })

    expect((await store.removeConfigValue('扬声器配置', '8扬声器')).ok).toBe(true)
    expect(store.rows[0]?.values.map((value) => value.value)).toEqual(['14扬声器', '10扬声器'])

    expect((await store.removeConfiguration('功放型号')).ok).toBe(true)
    expect(store.rows.map((row) => row.config_key)).toEqual(['扬声器配置'])
    expect(bridge.save).toHaveBeenCalledTimes(2)
  })

  it('重命名配置项会同步配置值里的 config_key', async () => {
    const { store, bridge } = await storeWithData({ document: configsDocument() })

    const result = await store.renameConfiguration('功放型号', '功放编码')

    expect(result.ok).toBe(true)
    const saved = bridge.save.mock.calls[0]?.[0] as Configuration[]
    expect(saved[1]?.config_key).toBe('功放编码')
    expect(saved[1]?.config_value[0]?.config_key).toBe('功放编码')
  })

  it('不存在的配置项 / 配置值给出错误', async () => {
    const { store } = await storeWithData({ document: configsDocument() })

    expect(await store.removeConfiguration('不存在')).toMatchObject({ ok: false })
    expect(await store.removeConfigValue('扬声器配置', '不存在')).toMatchObject({ ok: false })
    expect(await store.renameConfiguration('不存在', '新名称')).toMatchObject({ ok: false })
  })
})
