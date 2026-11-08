<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import SpecTreeNodeItem from '@/components/SpecTreeNodeItem.vue'
import { buildSpecTree, specCheckState, specDisplayName, specFilePaths } from '@/spec/tree'
import type { SpecTreeNode } from '@/spec/tree'
import { useConfigsStore } from '@/stores/configs'
import { useTasksStore } from '@/stores/tasks'
import { configureVehicleAssets } from '@/composables/vehicle-runtime'
import { useSpecsStore } from '@/stores/specs'

/**
 * 规格书：左侧 specs 目录树，右侧选中文件的场景车型差异。
 * 新增/减少只比较车型，非车型的 Gauge 标签不计入。
 */
const store = useSpecsStore()
const configsStore = useConfigsStore()
const tasksStore = useTasksStore()
const applying = ref(false)
const specRunning = ref(false)
const runVehicle = ref('')
const selectedPath = ref('')
const treeOpen = ref(true)
const collapseVersion = ref(0)
const checkedPaths = ref(new Set<string>())
const rootNode = computed<SpecTreeNode>(() => ({
  type: 'directory',
  name: '规格书',
  path: '',
  children: tree.value,
}))
const rootCheckState = computed(() => specCheckState(rootNode.value, checkedPaths.value))

function onToggle(node: SpecTreeNode, checked: boolean) {
  const next = new Set(checkedPaths.value)
  for (const path of specFilePaths(node)) {
    if (checked) next.add(path)
    else next.delete(path)
  }
  checkedPaths.value = next
}

function toggleTree() {
  if (treeOpen.value) {
    treeOpen.value = false
    collapseVersion.value += 1
  } else {
    treeOpen.value = true
  }
}

const tree = computed(() => buildSpecTree(store.entries))
const selectedEntry = computed(
  () => store.entries.find((entry) => entry.path === selectedPath.value) ?? store.entries[0] ?? null,
)

watch(
  () => store.entries,
  (entries) => {
    if (!entries.some((entry) => entry.path === selectedPath.value)) {
      selectedPath.value = entries[0]?.path ?? ''
    }
  },
  { immediate: true },
)

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}

const selectedRows = computed(() => {
  const entry = selectedEntry.value
  if (!entry) return []
  return entry.analysis.parsed.scenarios.map((scenario, index) => {
    const change = entry.analysis.changes[index]
    const before = change?.before ?? []
    const after = change?.after ?? []
    return {
      heading: scenario.heading,
      condition: scenario.condition,
      added: after.filter((tag) => tag !== '不适用' && !before.includes(tag)),
      removed: before.filter((tag) => tag !== '不适用' && !after.includes(tag)),
      changed: !sameTags(before, after),
      notApplicable: (entry.analysis.vehicles[index]?.length ?? 0) === 0,
    }
  })
})

function vehicleText(vehicles: string[]): string {
  return vehicles.length ? vehicles.join('/') : '-'
}

const selectedChangedCount = computed(() => selectedRows.value.filter((row) => row.changed).length)

async function prepareVehicleRun(): Promise<boolean> {
  if (!runVehicle.value) return true
  specRunning.value = true
  tasksStore.output = `正在自动配置车型 ${runVehicle.value} 的测试资产…`
  const result = await configureVehicleAssets(runVehicle.value)
  specRunning.value = false
  if (!result.ok) {
    tasksStore.output = result.steps.concat(result.error ? `[error] ${result.error}` : []).join('\n\n')
    ElMessage.error(result.error ?? '测试资产自动配置失败')
    return false
  }
  tasksStore.output = result.steps.join('\n\n')
  return true
}

async function runSpec() {
  if (!selectedEntry.value) return
  if (!(await prepareVehicleRun())) return
  specRunning.value = true
  const result = await tasksStore.runSpec(selectedEntry.value.path, runVehicle.value)
  specRunning.value = false
  if (result.ok) ElMessage.success('规格书运行完成')
  else ElMessage.error(result.error)
}

async function runScenario(heading: string) {
  if (!selectedEntry.value) return
  if (!(await prepareVehicleRun())) return
  specRunning.value = true
  const result = await tasksStore.run(
    [{ path: selectedEntry.value.path, heading }],
    runVehicle.value,
  )
  specRunning.value = false
  if (result.ok) ElMessage.success('场景运行完成')
  else ElMessage.error(result.error)
}

async function onApply() {
  applying.value = true
  const result = await store.apply()
  applying.value = false
  if (result.ok) {
    ElMessage.success(result.count ? `已更新 ${result.count} 个 spec 文件的场景标签` : '没有需要更新的标签')
  } else {
    ElMessage.error(result.error)
  }
}
</script>

<!--
  @grid A：标题 7 · 更新 5；左侧目录树 3 · 右侧详情 9。
  右侧场景表：场景 3 · 条件 3 · 新增 2 · 减少 2 · 状态 2。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-7 flex flex-wrap items-center">
          <h1 class="text-lg font-medium text-ink">规格书</h1>
        </div>
        <div class="col-span-5 flex justify-end gap-2">
          <el-button
            size="small"
            :loading="specRunning"
            :disabled="!selectedEntry"
            @click="runSpec"
          >
            运行规格书
          </el-button>
          <el-button
            size="small"
            type="primary"
            :loading="applying || store.saving"
            :disabled="!store.changedCount"
            @click="onApply"
          >
            更新场景标签
          </el-button>
        </div>
      </div>

      <!-- 运行车型：作为 gauge --tags 只运行该车型适用场景 -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
        <div class="col-span-3">
          <el-select
            v-model="runVehicle"
            size="small"
            clearable
            filterable
            placeholder="运行车型：全部"
            class="w-full"
          >
            <el-option
              v-for="vehicle in configsStore.vehicleOptions"
              :key="vehicle"
              :label="vehicle"
              :value="vehicle"
            />
          </el-select>
        </div>
        <p class="col-span-8 text-[11px] text-ink-muted">
          选择运行车型后，Gauge 会按 tags 中的车型标签自动筛选适用场景。
        </p>
      </div>
    </div>

    <el-alert
      v-if="store.error"
      class="w-[calc(11.5/12*100%)]"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="读取或保存 spec 文件失败，修正后重试即可。"
    />

    <el-alert
      v-if="store.warnings.length"
      class="w-[calc(11.5/12*100%)]"
      type="warning"
      show-icon
      :closable="false"
      title="部分适用条件无法解析"
      :description="store.warnings.join('；')"
    />

    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取 spec 文件…</p>
      <el-empty v-else-if="!store.hasData" description="该项目还没有 spec 文件" />

      <div v-else class="grid grid-cols-12 gap-3">
        <!-- 左：specs 下一层开始的目录树 -->
        <div class="col-span-3">
          <div class="max-h-[65vh] overflow-y-auto border border-line py-1">
            <!-- 根节点：规格书，一键折叠全部子目录 -->
            <div class="flex items-center">
              <el-checkbox
                size="small"
                :model-value="rootCheckState === 'checked'"
                :indeterminate="rootCheckState === 'indeterminate'"
                aria-label="选择全部规格书"
                @change="onToggle(rootNode, rootCheckState !== 'checked')"
              />
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-1 px-1 py-1 text-left text-[11px] font-medium text-ink outline-none hover:bg-surface focus-visible:ring-1 focus-visible:ring-primary/40"
                :title="treeOpen ? '一键折叠全部目录' : '展开规格书目录'"
                @click="toggleTree"
              >
              <svg class="size-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                <path v-if="treeOpen" d="M4 6.5 8 10.5 12 6.5" />
                <path v-else d="M6.5 4 10.5 8 6.5 12" />
              </svg>
              <span>规格书</span>
              </button>
            </div>
            <template v-if="treeOpen">
              <SpecTreeNodeItem
                v-for="node in tree"
                :key="`${node.type}-${node.path}`"
                :node="node"
                :depth="0"
                :selected-path="selectedEntry?.path ?? ''"
                selectable
                :checked-paths="checkedPaths"
                :collapse-version="collapseVersion"
                @select="selectedPath = $event"
                @toggle="onToggle"
              />
            </template>
          </div>
        </div>

        <!-- 右：选中 spec 的场景车型差异 -->
        <div class="col-span-9 min-w-0">
          <div v-if="selectedEntry" class="border border-line">
            <div class="border-b border-line bg-surface-soft px-3 py-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="min-w-0 truncate text-[13px] font-medium text-ink" :title="selectedEntry.name">
                  {{ specDisplayName(selectedEntry.name) }}
                </h2>
                <el-tag v-if="selectedChangedCount" size="small" type="warning" effect="plain">
                  {{ selectedChangedCount }} 个场景待更新
                </el-tag>
              </div>
              <p
                v-if="selectedEntry.analysis.parsed.specCondition"
                class="mt-1 truncate text-[11px] text-ink-muted"
                title="规格书级适用条件（作用于全部场景）"
              >
                规格书适用条件：{{ selectedEntry.analysis.parsed.specCondition }}
              </p>
            </div>

            <div class="grid grid-cols-12 items-center border-b border-line bg-surface-soft/50 text-[11px] font-medium text-ink">
              <div class="col-span-3 px-3 py-2">场景</div>
              <div class="col-span-2 px-2 py-2">适用条件</div>
              <div class="col-span-2 px-2 py-2">新增车型</div>
              <div class="col-span-2 px-2 py-2">减少车型</div>
              <div class="col-span-2 px-2 py-2 text-center">状态</div>
              <div class="col-span-1 px-2 py-2 text-center">操作</div>
            </div>

            <div
              v-for="(row, index) in selectedRows"
              :key="`${row.heading}-${index}`"
              class="grid grid-cols-12 items-center border-b border-line/50 last:border-b-0"
            >
              <p class="col-span-3 min-w-0 truncate px-3 py-2 text-[11px] text-ink" :title="row.heading">
                {{ row.heading }}
              </p>
              <p class="col-span-2 min-w-0 truncate px-2 py-2 text-[11px] text-ink-muted" :title="row.condition ?? ''">
                {{ row.condition || '（默认全部车型）' }}
              </p>
              <p class="col-span-2 min-w-0 truncate px-2 py-2 text-[11px] text-ink" :title="vehicleText(row.added)">
                {{ vehicleText(row.added) }}
              </p>
              <p class="col-span-2 min-w-0 truncate px-2 py-2 text-[11px] text-ink" :title="vehicleText(row.removed)">
                {{ vehicleText(row.removed) }}
              </p>
              <div class="col-span-2 flex justify-center px-2 py-2">
                <el-tag v-if="row.notApplicable" size="small" type="warning" effect="plain">不适用</el-tag>
                <el-tag v-else-if="row.changed" size="small" type="primary" effect="plain">待更新</el-tag>
                <el-tag v-else size="small" type="info" effect="plain">无变化</el-tag>
              </div>
              <div class="col-span-1 flex justify-center px-1 py-2">
                <el-button
                  size="small"
                  link
                  type="primary"
                  :loading="specRunning"
                  @click="runScenario(row.heading)"
                >
                  运行
                </el-button>
              </div>
            </div>
            <p v-if="!selectedRows.length" class="px-3 py-3 text-[11px] text-ink-muted">
              文件中没有场景
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
