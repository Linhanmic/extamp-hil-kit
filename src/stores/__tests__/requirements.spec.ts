import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRequirementsStore } from '../requirements'
import type { DesktopBridge } from '@/types/desktop'
import type { RequirementsDocument, RequirementsLoadOutcome } from '@/models'

const DOCUMENT: RequirementsDocument = {
  schemaVersion: 1,
  createdAt: '2026-11-07T05:30:00.000Z',
  updatedAt: '2026-11-07T07:42:00.000Z',
  requirements: [
    {
      id: 'REQ_1',
      name: '功放握手',
      detail: '…',
      variants: [
        { requirement_id: 'REQ_1', key: '', content: [], vehicles: ['HFAF', 'EFSS'] },
        { requirement_id: 'REQ_1', key: '变体1', content: ['变体1'], vehicles: ['EFSS', 'QDWS'] },
      ],
    },
    {
      id: 'REQ_2',
      name: '音量控制',
      detail: '…',
      variants: [{ requirement_id: 'REQ_2', key: '变体2', content: ['变体2'], vehicles: ['QDWS'] }],
    },
  ],
}

function installLoad(outcome: RequirementsLoadOutcome) {
  const load = vi.fn<DesktopBridge['requirements']['load']>(async () => outcome)
  window.desktop = {
    requirements: { load },
  } as unknown as DesktopBridge
  return load
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.desktop = undefined
})

describe('useRequirementsStore', () => {
  it('读取成功后汇总需求数、变体数与车型数（车型从变体去重）', async () => {
    const load = installLoad({ document: DOCUMENT })
    const store = useRequirementsStore()

    await store.load()

    expect(load).toHaveBeenCalledTimes(1)
    expect(store.document).toMatchObject({ schemaVersion: 1 })
    expect(store.hasData).toBe(true)
    expect(store.requirementCount).toBe(2)
    expect(store.variantCount).toBe(3)
    expect(store.vehicleCount).toBe(3)
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
    expect(store.loading).toBe(false)
  })

  it('没有导入过时按空状态处理', async () => {
    installLoad({ empty: true })
    const store = useRequirementsStore()

    await store.load()

    expect(store.document).toBeNull()
    expect(store.hasData).toBe(false)
    expect(store.error).toBe('')
    expect(store.loaded).toBe(true)
  })

  it('文件不可用时保留错误信息，不把半份数据当可信对象', async () => {
    installLoad({ error: '需求数据结构不正确，请重新导入' })
    const store = useRequirementsStore()

    await store.load()

    expect(store.document).toBeNull()
    expect(store.error).toBe('需求数据结构不正确，请重新导入')
  })

  it('切换项目时 clear 会清空，避免串用上一个项目的数据', async () => {
    installLoad({ document: DOCUMENT })
    const store = useRequirementsStore()
    await store.load()

    store.clear()

    expect(store.document).toBeNull()
    expect(store.hasData).toBe(false)
    expect(store.loaded).toBe(false)
  })

  it('浏览器里没有主进程桥接时不报错，保持空状态', async () => {
    const store = useRequirementsStore()

    await store.load()

    expect(store.document).toBeNull()
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
  })
})
