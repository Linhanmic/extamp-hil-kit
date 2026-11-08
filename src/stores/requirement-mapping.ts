import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useWorkspace } from '@/composables/useWorkspace'

const STORAGE_PREFIX = 'extamp-hil-mapping-status:'

export function mappingStorageKey(projectPath: string): string {
  return `${STORAGE_PREFIX}${projectPath.replace(/\\/g, '/')}`
}

/** 读取某项目下「不参与参数映射」的需求 ID 集合 */
export function readExcludedMappingIds(projectPath: string): Set<string> {
  if (!projectPath) return new Set()
  try {
    const raw = localStorage.getItem(mappingStorageKey(projectPath))
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function writeExcludedMappingIds(projectPath: string, ids: Set<string>): void {
  if (!projectPath) return
  localStorage.setItem(mappingStorageKey(projectPath), JSON.stringify([...ids]))
}

/**
 * 需求映射参与状态：默认参与，不参与的 ID 按项目持久化。
 * 只影响关联状态判定，不改写 requirements.json。
 */
export const useRequirementMappingStore = defineStore('requirementMapping', () => {
  const { project } = useWorkspace()
  const excludedIds = ref(new Set<string>())

  watch(
    () => project.value?.path,
    (path) => {
      excludedIds.value = readExcludedMappingIds(path ?? '')
    },
    { immediate: true },
  )

  function isParticipating(requirementId: string): boolean {
    return !excludedIds.value.has(requirementId)
  }

  function setParticipating(requirementId: string, participating: boolean) {
    const next = new Set(excludedIds.value)
    if (participating) next.delete(requirementId)
    else next.add(requirementId)
    excludedIds.value = next
    writeExcludedMappingIds(project.value?.path ?? '', next)
  }

  return { excludedIds, isParticipating, setParticipating }
})
