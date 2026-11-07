import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_PROJECT_SETTINGS } from '@/config/settings-defaults'
import type { ProjectSettings, ProjectSettingsDocument, SettingsPickKind } from '@/models'
import { useConfigsStore } from './configs'
import { useMeterStore } from './meter'
import { useOutputStore } from './output'
import { useRequirementsStore } from './requirements'
import { useSlotMapStore } from './slotMap'
import { useSnapshotStore } from './snapshot'

export type SaveResult = { ok: true } | { ok: false; error: string }

/**
 * 项目设置：应用启动、切换项目时从 `<项目>/.hil-kit/settings.json` 读回来。
 * 文件缺失或损坏时主进程带回默认值，这里直接用 `settings` 即可，不用区分「有没有配过」。
 *
 * 保存后各业务数据按新路径重读一次——设置改了路径，页面上的数据就要跟着换。
 */
export const useSettingsStore = defineStore('settings', () => {
  const requirementsStore = useRequirementsStore()
  const configsStore = useConfigsStore()
  const outputStore = useOutputStore()
  const meterStore = useMeterStore()
  const slotMapStore = useSlotMapStore()
  const snapshotStore = useSnapshotStore()

  const document = ref<ProjectSettingsDocument | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  /** 设置文件不可用（解析失败 / 版本不支持）或保存失败的原因 */
  const error = ref('')
  const loaded = ref(false)

  const settings = computed(() => document.value?.settings ?? DEFAULT_PROJECT_SETTINGS)
  const updatedAt = computed(() => document.value?.updatedAt ?? '')

  async function load() {
    const api = window.desktop?.settings
    // 浏览器里跑（npm run preview）没有主进程，保持默认值
    if (!api?.load) {
      loaded.value = true
      return
    }

    loading.value = true
    error.value = ''
    try {
      const outcome = await api.load()
      document.value = outcome.document ?? null
      if (outcome.error) error.value = outcome.error
    } catch {
      document.value = null
      error.value = '读取项目设置失败'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  /** 切换 / 解绑项目时清空，回落到默认设置 */
  function clear() {
    document.value = null
    error.value = ''
    loaded.value = false
  }

  async function save(next: ProjectSettings): Promise<SaveResult> {
    const api = window.desktop?.settings
    if (!api?.save) return { ok: false, error: '设置只在桌面端可保存' }

    saving.value = true
    try {
      // IPC 用结构化克隆传参，Vue 响应式代理不能被克隆
      const payload = JSON.parse(JSON.stringify(next)) as ProjectSettings
      const outcome = await api.save(payload)
      if (!outcome.saved) {
        const message = outcome.error ?? '保存设置失败'
        error.value = message
        return { ok: false, error: message }
      }

      // 以盘上的数据为准（主进程会 trim、校验列号）
      await load()
      await Promise.all([
        requirementsStore.load(),
        configsStore.load(),
        outputStore.load(),
        meterStore.load(),
        slotMapStore.load(),
        snapshotStore.load(),
      ])
      return { ok: true }
    } catch {
      const message = '保存设置失败'
      error.value = message
      return { ok: false, error: message }
    } finally {
      saving.value = false
    }
  }

  async function pickFile(kind: SettingsPickKind) {
    const api = window.desktop?.settings
    if (!api?.pickFile) return { error: '设置只在桌面端可用' }
    return api.pickFile(kind)
  }

  async function pickDirectory() {
    const api = window.desktop?.settings
    if (!api?.pickDirectory) return { error: '设置只在桌面端可用' }
    return api.pickDirectory()
  }

  return {
    document,
    loading,
    saving,
    error,
    loaded,
    settings,
    updatedAt,
    load,
    clear,
    save,
    pickFile,
    pickDirectory,
  }
})
