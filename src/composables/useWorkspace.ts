import { ref } from 'vue'
import type { WorkspaceProject, WorkspaceState } from '@/types/desktop'

// 工作区状态：模块级单例，App 闸门、启动页与侧栏共用
const project = ref<WorkspaceProject | null>(null)
const recents = ref<WorkspaceProject[]>([])
const ready = ref(false)
const busy = ref(false)
const error = ref('')

function apply(state: WorkspaceState) {
  project.value = state.current
  recents.value = state.recents
}

export function useWorkspace() {
  const bridge = () => window.desktop?.workspace

  /** 启动时读取已保存的项目；没有则停在启动页 */
  const load = async () => {
    const api = bridge()
    if (!api) {
      error.value = '未检测到桌面端环境，无法读取本地项目（请通过 npm run dev 或安装包启动）'
      ready.value = true
      return
    }
    try {
      apply(await api.current())
    } catch {
      error.value = '读取工作区失败，请重新选择项目'
    } finally {
      ready.value = true
    }
  }

  /** 打开系统目录选择器 */
  const choose = async () => {
    const api = bridge()
    if (!api) return
    busy.value = true
    error.value = ''
    try {
      const result = await api.choose()
      if (result.canceled) return
      if (result.error) {
        error.value = result.error
        return
      }
      apply(result.state)
    } finally {
      busy.value = false
    }
  }

  /** 从最近列表按路径打开 */
  const openPath = async (dir: string) => {
    const api = bridge()
    if (!api) return
    busy.value = true
    error.value = ''
    try {
      const result = await api.open(dir)
      if (result.error) {
        error.value = result.error
        return
      }
      apply(result.state)
    } finally {
      busy.value = false
    }
  }

  /** 回到启动页重新选择（保留最近列表） */
  const clear = async () => {
    const api = bridge()
    if (!api) return
    apply(await api.clear())
    error.value = ''
  }

  return { project, recents, ready, busy, error, load, choose, openPath, clear }
}
