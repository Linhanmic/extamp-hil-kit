import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRequirementsImport } from '../useRequirementsImport'
import type { DesktopBridge } from '@/types/desktop'

type DesktopRequirements = DesktopBridge['requirements']

const CONFIG_RESULT = {
  vehicles: ['HFAF', 'EFSS'],
  requirements: [{ id: 'REQ_1', name: '功放握手', detail: '…', variants: [] }],
  stats: {
    dataRows: 1,
    blankRows: 0,
    skippedRows: 0,
    mergedRows: 0,
    requirementCount: 1,
    variantCount: 1,
    vehicleCount: 2,
    applicableCells: 1,
    notApplicableCells: 0,
    textCells: 0,
  },
  warnings: [],
}

function installBridge(overrides: Partial<DesktopRequirements> = {}) {
  const bridge: DesktopRequirements = {
    choose: vi.fn<DesktopRequirements['choose']>(async () => ({
      file: { filePath: 'E:\\datas\\需求分析表.xlsx', sheets: ['1、封面', '6、软件需求分析表'] },
    })),
    probe: vi.fn<DesktopRequirements['probe']>(async () => ({
      probe: {
        sheetName: '6、软件需求分析表',
        rowCount: 6,
        headerRow: 2,
        mapping: { headerRow: 2, idCol: 'A', nameCol: 'B', detailCol: 'E', vehicleStartCol: 'G' },
        columns: [
          {
            index: 1,
            letter: 'A',
            header: '需求ID',
            isPlatform: false,
            applicableCells: 0,
            notApplicableCells: 0,
            textCells: 0,
          },
          {
            index: 7,
            letter: 'G',
            header: 'MA16D平台',
            isPlatform: true,
            applicableCells: 4,
            notApplicableCells: 0,
            textCells: 0,
          },
        ],
        notes: [],
      },
    })),
    preview: vi.fn<DesktopRequirements['preview']>(async () => ({
      result: structuredClone(CONFIG_RESULT),
    })),
    save: vi.fn<DesktopRequirements['save']>(async () => ({
      saved: {
        filePath: 'E:\\project\\.hil-kit\\requirements.json',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:05:00.000Z',
        requirementCount: 1,
        variantCount: 1,
      },
    })),
    ...overrides,
  }

  window.desktop = { requirements: bridge } as unknown as DesktopBridge
  return bridge
}

beforeEach(() => {
  window.desktop = undefined
})

describe('useRequirementsImport', () => {
  it('没有桌面端桥接时提示不可用', async () => {
    const flow = useRequirementsImport()
    expect(flow.available.value).toBe(false)

    await flow.chooseFile()
    expect(flow.error.value).toContain('未检测到桌面端环境')
  })

  it('选表后自动探测列配置，再解析预览', async () => {
    const bridge = installBridge()
    const flow = useRequirementsImport()
    expect(flow.available.value).toBe(true)

    await flow.chooseFile()
    // 工作表优先挑名字带「需求」的那个
    expect(flow.sheetName.value).toBe('6、软件需求分析表')
    expect(flow.fileName.value).toBe('需求分析表.xlsx')
    expect(flow.mapping.vehicleStartCol).toBe('G')
    expect(flow.probe.value?.columns).toHaveLength(2)
    expect(bridge.probe).toHaveBeenCalledWith(
      'E:\\datas\\需求分析表.xlsx',
      '6、软件需求分析表',
      undefined,
    )

    await flow.preview()
    expect(bridge.preview).toHaveBeenCalledWith({
      filePath: 'E:\\datas\\需求分析表.xlsx',
      sheetName: '6、软件需求分析表',
      headerRow: 2,
      idCol: 'A',
      nameCol: 'B',
      detailCol: 'E',
      vehicleStartCol: 'G',
    })
    expect(flow.result.value?.stats.requirementCount).toBe(1)
    expect(flow.dirty.value).toBe(false)
  })

  it('导入成功后记录落盘路径', async () => {
    installBridge()
    const flow = useRequirementsImport()
    await flow.chooseFile()
    await flow.preview()
    await flow.save()

    expect(flow.saved.value?.filePath).toBe('E:\\project\\.hil-kit\\requirements.json')
    expect(flow.saved.value?.requirementCount).toBe(1)
    expect(flow.error.value).toBe('')
  })

  it('修改列配置后旧预览失效', async () => {
    installBridge()
    const flow = useRequirementsImport()
    await flow.chooseFile()
    await flow.preview()
    expect(flow.result.value).not.toBeNull()

    flow.updateMapping({ vehicleStartCol: 'H' })
    expect(flow.mapping.vehicleStartCol).toBe('H')
    expect(flow.result.value).toBeNull()
    expect(flow.dirty.value).toBe(true)
  })

  it('解析失败时回传主进程的错误信息', async () => {
    installBridge({
      preview: vi.fn<DesktopRequirements['preview']>(async () => ({
        error: '车型起始列必须在需求详情列之后',
      })),
    })
    const flow = useRequirementsImport()
    await flow.chooseFile()
    await flow.preview()

    expect(flow.error.value).toBe('车型起始列必须在需求详情列之后')
    expect(flow.result.value).toBeNull()
  })

  it('取消选择文件不改动状态', async () => {
    installBridge({
      choose: vi.fn<DesktopRequirements['choose']>(async () => ({ canceled: true })),
    })
    const flow = useRequirementsImport()
    await flow.chooseFile()

    expect(flow.file.value).toBeNull()
    expect(flow.error.value).toBe('')
  })
})
