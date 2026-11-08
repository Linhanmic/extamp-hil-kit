<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SpecTreeNodeItem from '@/components/SpecTreeNodeItem.vue'
import { buildSpecTree, specDisplayName } from '@/spec/tree'
import { useSpecsStore } from '@/stores/specs'
import { useTasksStore } from '@/stores/tasks'
import type { TaskScenario } from '@/models'

/** 新建任务：按 spec 文件选择具体场景，保存后可用 Gauge 单独运行 */
const specsStore = useSpecsStore()
const tasksStore = useTasksStore()

const taskName = ref('')
const selectedTaskId = ref('')
const selectedPath = ref('')
const selectedKeys = ref(new Set<string>())
const treeOpen = ref(true)
const collapseVersion = ref(0)

const tree = computed(() => buildSpecTree(specsStore.entries))
const selectedEntry = computed(
  () => specsStore.entries.find((entry) => entry.path === selectedPath.value) ?? specsStore.entries[0] ?? null,
)
const selectedScenarios = computed<TaskScenario[]>(() => {
  const selected: TaskScenario[] = []
  for (const entry of specsStore.entries) {
    for (const scenario of entry.analysis.parsed.scenarios) {
      if (selectedKeys.value.has(`${entry.path} ${scenario.heading}`)) {
        selected.push({ path: entry.path, heading: scenario.heading })
      }
    }
  }
  return selected
})

watch(
  () => specsStore.entries,
  (entries) => {
    if (!entries.some((entry) => entry.path === selectedPath.value)) {
      selectedPath.value = entries[0]?.path ?? ''
    }
  },
  { immediate: true },
)

onMounted(() => {
  void tasksStore.load()
})

function toggleTree() {
  if (treeOpen.value) {
    treeOpen.value = false
    collapseVersion.value += 1
  } else {
    treeOpen.value = true
  }
}

function scenarioKey(path: string, heading: string): string {
  return `${path} ${heading}`
}

function toggleScenario(path: string, heading: string, checked: boolean) {
  const next = new Set(selectedKeys.value)
  const key = scenarioKey(path, heading)
  if (checked) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}

function loadTask(id: string) {
  const task = tasksStore.tasks.find((item) => item.id === id)
  if (!task) return
  taskName.value = task.name
  selectedKeys.value = new Set(task.scenarios.map((scenario) => scenarioKey(scenario.path, scenario.heading)))
}

async function save(): Promise<string | null> {
  const result = await tasksStore.saveTask(taskName.value, selectedScenarios.value, selectedTaskId.value)
  if (!result.ok) {
    ElMessage.error(result.error)
    return null
  }
  selectedTaskId.value = result.id
  ElMessage.success('任务已保存')
  return result.id
}

async function runTask() {
  const id = await save()
  if (!id) return
  const result = await tasksStore.run(selectedScenarios.value)
  if (result.ok) ElMessage.success('任务运行完成')
  else ElMessage.error(result.error)
}

async function runScenariosOnly() {
  if (!selectedScenarios.value.length) return
  const result = await tasksStore.run(selectedScenarios.value)
  if (result.ok) ElMessage.success('选中场景运行完成')
  else ElMessage.error(result.error)
}
</script>

<!--
  @grid A：任务名 4 · 已有任务 3 · 保存 2 · 运行 3；
  左侧 spec 树 4 · 右侧场景选择 8。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-3">
          <h1 class="text-lg font-medium text-ink">新建任务</h1>
        </div>
        <div class="col-span-2">
          <el-select
            :model-value="selectedTaskId || undefined"
            size="small"
            clearable
            placeholder="载入已有任务"
            class="w-full"
            @change="loadTask"
          >
            <el-option
              v-for="task in tasksStore.tasks"
              :key="task.id"
              :label="task.name"
              :value="task.id"
            />
          </el-select>
        </div>
        <div class="col-span-2">
          <el-input v-model="taskName" size="small" placeholder="任务名称" />
        </div>
        <div class="col-span-1 flex justify-end">
          <el-button size="small" :loading="tasksStore.saving" @click="save">保存</el-button>
        </div>
        <div class="col-span-2 flex justify-end">
          <el-button
            size="small"
            :loading="tasksStore.running"
            :disabled="!selectedScenarios.length"
            @click="runScenariosOnly"
          >
            运行场景
          </el-button>
        </div>
        <div class="col-span-2 flex justify-end">
          <el-button
            size="small"
            type="primary"
            :loading="tasksStore.running"
            :disabled="!selectedScenarios.length"
            @click="runTask"
          >
            运行任务
          </el-button>
        </div>
      </div>
    </div>

    <el-alert
      v-if="tasksStore.error"
      class="w-[calc(11.5/12*100%)]"
      type="error"
      :closable="false"
      show-icon
      :title="tasksStore.error"
    />

    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="specsStore.loading" class="text-[11px] text-ink-muted">正在读取 spec 文件…</p>
      <el-empty v-else-if="!specsStore.hasData" description="该项目还没有 spec 文件" />

      <div v-else class="grid grid-cols-12 gap-3">
        <!-- 左：spec 文件树 -->
        <div class="col-span-4">
          <div class="max-h-[60vh] overflow-y-auto border border-line py-1">
            <button
              type="button"
              class="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] font-medium text-ink outline-none hover:bg-surface"
              @click="toggleTree"
            >
              <svg class="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                <path v-if="treeOpen" d="M4 6.5 8 10.5 12 6.5" />
                <path v-else d="M6.5 4 10.5 8 6.5 12" />
              </svg>
              规格书
            </button>
            <template v-if="treeOpen">
              <SpecTreeNodeItem
                v-for="node in tree"
                :key="`${node.type}-${node.path}`"
                :node="node"
                :depth="0"
                :selected-path="selectedEntry?.path ?? ''"
                :collapse-version="collapseVersion"
                @select="selectedPath = $event"
              />
            </template>
          </div>
        </div>

        <!-- 右：选中文件的具体场景 -->
        <div class="col-span-8 min-w-0">
          <div v-if="selectedEntry" class="border border-line">
            <div class="flex items-center justify-between gap-2 border-b border-line bg-surface-soft px-3 py-2">
              <h2 class="min-w-0 truncate text-[13px] font-medium text-ink" :title="selectedEntry.name">
                {{ specDisplayName(selectedEntry.name) }}
              </h2>
              <span class="shrink-0 text-[11px] text-ink-muted">
                已选 {{ selectedScenarios.length }} 个场景
              </span>
            </div>
            <div
              v-for="scenario in selectedEntry.analysis.parsed.scenarios"
              :key="scenario.heading"
              class="flex items-start gap-2 border-b border-line/50 px-3 py-2 last:border-b-0"
            >
              <el-checkbox
                size="small"
                :model-value="selectedKeys.has(scenarioKey(selectedEntry.path, scenario.heading))"
                @change="toggleScenario(selectedEntry.path, scenario.heading, $event === true)"
              >
                <span class="text-[11px] text-ink">{{ scenario.heading }}</span>
              </el-checkbox>
              <span
                v-if="scenario.condition"
                class="min-w-0 truncate pt-0.5 text-[11px] text-ink-muted"
                :title="scenario.condition"
              >
                {{ scenario.condition }}
              </span>
            </div>
            <p
              v-if="!selectedEntry.analysis.parsed.scenarios.length"
              class="px-3 py-3 text-[11px] text-ink-muted"
            >
              文件中没有场景
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
