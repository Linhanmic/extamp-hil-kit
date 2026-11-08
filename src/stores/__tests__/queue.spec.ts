import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useQueueStore } from '../queue'
import type { TaskRunOutcome } from '@/models'
import type { DesktopBridge } from '@/types/desktop'

function outcome(exitCode: number): TaskRunOutcome {
  return { command: 'gauge run', stdout: '', stderr: '', exitCode }
}

describe('测试队列', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.desktop = undefined
  })

  it('按顺序执行，并允许执行中继续入队', async () => {
    const calls: string[] = []
    const completions: (() => void)[] = []
    const run = vi.fn<DesktopBridge['tasks']['run']>((scenarios, tags) => {
      calls.push(`${scenarios[0]!.heading}:${tags ?? ''}`)
      return new Promise<TaskRunOutcome>((resolve) => {
        completions.push(() => resolve(outcome(0)))
      })
    })
    window.desktop = {
      tasks: { run, runSpec: vi.fn<DesktopBridge['tasks']['runSpec']>() },
    } as unknown as DesktopBridge

    const store = useQueueStore()
    store.enqueueScenario({ path: '/specs/a.spec', heading: 'A' }, 'HFAF')
    store.enqueueScenario({ path: '/specs/a.spec', heading: 'B' }, 'HFAF')
    const started = store.start()
    store.enqueueScenario({ path: '/specs/b.spec', heading: 'C' }, 'YU2')

    for (let index = 0; index < 3; index++) {
      for (let guard = 0; guard < 10 && completions.length === 0; guard++) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      completions.shift()!()
    }
    await started

    expect(calls).toEqual(['A:HFAF', 'B:HFAF', 'C:YU2'])
    expect(store.items.map((item) => item.status)).toEqual(['success', 'success', 'success'])
    expect(store.pendingCount).toBe(0)
    expect(store.running).toBe(false)
  })

  it('失败项标记失败后继续执行后续项', async () => {
    const run = vi
      .fn<DesktopBridge['tasks']['run']>()
      .mockResolvedValueOnce(outcome(1))
      .mockResolvedValueOnce(outcome(0))
    window.desktop = {
      tasks: { run, runSpec: vi.fn<DesktopBridge['tasks']['runSpec']>() },
    } as unknown as DesktopBridge

    const store = useQueueStore()
    store.enqueueScenario({ path: '/specs/a.spec', heading: 'A' })
    store.enqueueScenario({ path: '/specs/b.spec', heading: 'B' })
    await store.start()

    expect(store.items.map((item) => item.status)).toEqual(['failed', 'success'])
    expect(store.failedCount).toBe(1)
    expect(store.successCount).toBe(1)
  })
})
