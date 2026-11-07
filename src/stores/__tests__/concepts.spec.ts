import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConceptsStore } from '../concepts'
import type { DesktopBridge } from '@/types/desktop'
import type {
  ConceptsDeleteOutcome,
  ConceptsListOutcome,
  ConceptsWriteOutcome,
} from '@/models'

const FILE_A_TEXT = ['# create user <user-id>', '* assign id <user-id>', ''].join('\n')
const FILE_B_TEXT = ['# login <user-id>', '* input <user-id>', ''].join('\n')

function installDesktop(handlers: {
  list: ConceptsListOutcome
  read?: Record<string, { file?: { path: string; name: string; text: string }; error?: string }>
  write?: ConceptsWriteOutcome | ((path: string, text: string) => ConceptsWriteOutcome)
  delete?: ConceptsDeleteOutcome
}) {
  const list = vi.fn<DesktopBridge['concepts']['list']>(async () => handlers.list)
  const read = vi.fn<DesktopBridge['concepts']['read']>(async (path: string) => {
    const entry = handlers.read?.[path]
    if (entry) return entry
    return { error: '封装文件无法读取' }
  })
  const write = vi.fn<DesktopBridge['concepts']['write']>(async (path: string, text: string) => {
    if (typeof handlers.write === 'function') return handlers.write(path, text)
    return handlers.write ?? { saved: { filePath: path, updatedAt: '2026-01-01T00:00:00.000Z' } }
  })
  const remove = vi.fn<DesktopBridge['concepts']['delete']>(async () => handlers.delete ?? { deleted: true })

  window.desktop = {
    concepts: { list, read, write, delete: remove },
  } as unknown as DesktopBridge
  return { list, read, write, remove }
}

beforeEach(() => {
  setActivePinia(createPinia())
  window.desktop = undefined
})

describe('useConceptsStore', () => {
  it('浏览器环境（无主进程）保持空状态', async () => {
    const store = useConceptsStore()
    await store.load()
    expect(store.loaded).toBe(true)
    expect(store.fileCount).toBe(0)
    expect(store.error).toBe('')
  })

  it('读取后解析封装、步骤与问题，按文件名排序', async () => {
    installDesktop({
      list: {
        files: [
          { path: '/p/concepts/b.cpt', name: 'b.cpt' },
          { path: '/p/concepts/a.cpt', name: 'a.cpt' },
        ],
      },
      read: {
        '/p/concepts/a.cpt': {
          file: { path: '/p/concepts/a.cpt', name: 'a.cpt', text: FILE_A_TEXT },
        },
        '/p/concepts/b.cpt': {
          file: {
            path: '/p/concepts/b.cpt',
            name: 'b.cpt',
            text: ['# broken', ''].join('\n'),
          },
        },
      },
    })
    const store = useConceptsStore()

    await store.load()

    expect(store.fileCount).toBe(2)
    expect(store.files[0]!.name).toBe('a.cpt')
    expect(store.files[0]!.concepts[0]!.heading).toBe('create user <user-id>')
    expect(store.files[0]!.concepts[0]!.params).toEqual(['user-id'])
    expect(store.files[0]!.issues).toEqual([])
    // b.cpt 的封装没有步骤
    expect(store.files[1]!.issues[0]!.message).toBe('封装至少需要一个步骤')
    expect(store.conceptCount).toBe(2)
    expect(store.issueCount).toBe(1)
  })

  it('跨文件重复标题会被标出', async () => {
    installDesktop({
      list: {
        files: [
          { path: '/p/concepts/a.cpt', name: 'a.cpt' },
          { path: '/p/concepts/b.cpt', name: 'b.cpt' },
        ],
      },
      read: {
        '/p/concepts/a.cpt': {
          file: { path: '/p/concepts/a.cpt', name: 'a.cpt', text: FILE_A_TEXT },
        },
        '/p/concepts/b.cpt': {
          file: {
            path: '/p/concepts/b.cpt',
            name: 'b.cpt',
            text: FILE_A_TEXT.replace('assign', 'assign'),
          },
        },
      },
    })
    const store = useConceptsStore()
    await store.load()

    expect(store.duplicates.has('create user <user-id>')).toBe(true)
    expect(store.duplicates.get('create user <user-id>')).toEqual(['a.cpt', 'b.cpt'])
  })

  it('保存时拦下校验失败与跨文件标题冲突', async () => {
    const { write } = installDesktop({
      list: { files: [{ path: '/p/concepts/a.cpt', name: 'a.cpt' }] },
      read: {
        '/p/concepts/a.cpt': {
          file: { path: '/p/concepts/a.cpt', name: 'a.cpt', text: FILE_A_TEXT },
        },
      },
    })
    const store = useConceptsStore()
    await store.load()

    // 缺步骤
    const bad = await store.saveConcepts('/p/concepts/a.cpt', [
      { heading: 'x', params: [], steps: [] },
    ])
    expect(bad).toEqual({ ok: false, error: '封装至少需要一个步骤' })
    expect(write).not.toHaveBeenCalled()

    // 与其他文件标题冲突：把 b.cpt 的标题写进 a.cpt
    installDesktop({
      list: {
        files: [
          { path: '/p/concepts/a.cpt', name: 'a.cpt' },
          { path: '/p/concepts/b.cpt', name: 'b.cpt' },
        ],
      },
      read: {
        '/p/concepts/a.cpt': {
          file: { path: '/p/concepts/a.cpt', name: 'a.cpt', text: FILE_A_TEXT },
        },
        '/p/concepts/b.cpt': {
          file: { path: '/p/concepts/b.cpt', name: 'b.cpt', text: FILE_B_TEXT },
        },
      },
    })
    await store.load()
    const conflict = await store.saveConcepts('/p/concepts/a.cpt', [
      { heading: 'login <user-id>', params: ['user-id'], steps: [{ text: 'x', table: null }] },
    ])
    expect(conflict).toEqual({
      ok: false,
      error: '封装标题「login <user-id>」在其他文件中已存在',
    })
  })

  it('保存成功后重新加载', async () => {
    const written: string[] = []
    installDesktop({
      list: { files: [{ path: '/p/concepts/a.cpt', name: 'a.cpt' }] },
      read: {
        '/p/concepts/a.cpt': {
          file: { path: '/p/concepts/a.cpt', name: 'a.cpt', text: FILE_A_TEXT },
        },
      },
      write: (path, text) => {
        written.push(text)
        return { saved: { filePath: path, updatedAt: '2026-01-01T00:00:00.000Z' } }
      },
    })
    const store = useConceptsStore()
    await store.load()

    const result = await store.saveConcepts('/p/concepts/a.cpt', [
      {
        heading: 'create user <user-id>',
        params: ['user-id'],
        steps: [{ text: 'assign id <user-id>', table: null }],
      },
    ])

    expect(result).toEqual({ ok: true })
    expect(written).toEqual([FILE_A_TEXT])
    expect(store.saving).toBe(false)
  })

  it('删除文件成功后重新加载', async () => {
    const remove = vi.fn<DesktopBridge['concepts']['delete']>(async () => ({ deleted: true }))
    installDesktop({
      list: { files: [{ path: '/p/concepts/a.cpt', name: 'a.cpt' }] },
      read: {
        '/p/concepts/a.cpt': {
          file: { path: '/p/concepts/a.cpt', name: 'a.cpt', text: FILE_A_TEXT },
        },
      },
    })
    window.desktop!.concepts.delete = remove
    const store = useConceptsStore()
    await store.load()

    const result = await store.deleteFile('/p/concepts/a.cpt')

    expect(result).toEqual({ ok: true })
    expect(remove).toHaveBeenCalledWith('/p/concepts/a.cpt')
  })
})
