<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSlotMapStore } from '@/stores/slotMap'
import { useConceptsStore } from '@/stores/concepts'
import { serializeConcepts, validateConcepts } from '@/spec/concept-file'
import { formatSlots, scenarioSlots, sourceTitles } from '@/stores/slot-map-format'
import SlotPlanFormDialog from '@/components/SlotPlanFormDialog.vue'
import type { SlotMappingPlan } from '@/models'
import { buildVehicleConcepts, planSlotConcepts, summarizeMerge } from '@/composables/vehicle-assets'

/**
 * SLOT 映射：目录下每个 txt 是一种映射方案。
 * 总览按「音源 × 映射方案」展示；详情左侧方案列表，右侧车型与音源 SLOT。
 */
const store = useSlotMapStore()
const conceptsStore = useConceptsStore()
const viewMode = ref<'overview' | 'detail'>('overview')
const generating = ref(false)
const selectedName = ref('')
const vehicleFilter = ref('')
const sourceFilter = ref('')

const vehicleOptions = computed(() => {
  const names = new Set<string>()
  for (const plan of store.plans) {
    for (const vehicle of plan.vehicles) names.add(vehicle)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const visiblePlans = computed(() =>
  vehicleFilter.value
    ? store.plans.filter((plan) => plan.vehicles.includes(vehicleFilter.value))
    : store.plans,
)
const titles = computed(() =>
  sourceFilter.value
    ? sourceTitles(visiblePlans.value).filter((title) => title === sourceFilter.value)
    : sourceTitles(visiblePlans.value),
)
const sourceOptions = computed(() => sourceTitles(store.plans))
const selectedPlan = computed(
  () =>
    visiblePlans.value.find((plan) => plan.name === selectedName.value) ??
    visiblePlans.value[0] ??
    null,
)

const selectedScenarios = computed(() =>
  (selectedPlan.value?.scenarios ?? []).filter(
    (scenario) => !sourceFilter.value || scenario.title === sourceFilter.value,
  ),
)

watch(
  visiblePlans,
  (plans) => {
    if (!plans.some((plan) => plan.name === selectedName.value)) {
      selectedName.value = plans[0]?.name ?? ''
    }
  },
  { immediate: true },
)

function displayName(fileName: string): string {
  return fileName.replace(/\.txt$/i, '')
}

/** 方案增删改：编辑传当前方案，新建传 null */
const formVisible = ref(false)
const editingPlan = ref<SlotMappingPlan | null>(null)
const canEdit = computed(() => Boolean(window.desktop?.slotMap?.save))

function openCreatePlan() {
  editingPlan.value = null
  formVisible.value = true
}

function openEditPlan(plan: SlotMappingPlan) {
  editingPlan.value = plan
  formVisible.value = true
}

async function removePlan(plan: SlotMappingPlan) {
  try {
    await ElMessageBox.confirm(
      `确定删除映射方案「${displayName(plan.name)}」及其 ${plan.scenarios.length} 个音源场景？`,
      '删除映射方案',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  const result = await store.deletePlan(plan.name)
  if (result.ok) ElMessage.success('映射方案已删除')
  else ElMessage.error(result.error)
}

/** 生成只看目录数据与当前车型：默认方案 + 车型差异，同名默认项由车型版本替换 */
const generatePlan = computed(() => planSlotConcepts(store.plans, vehicleFilter.value))
const canGenerate = computed(
  () => Boolean(vehicleFilter.value) && generatePlan.value.defaults.length + generatePlan.value.vehicleSpecific.length > 0,
)

/** 按车型合并生成 <车型>-SLOT.cpt */
async function generateSlotCpt() {
  const vehicle = vehicleFilter.value
  const api = window.desktop?.concepts
  if (!vehicle || !api?.generateSlot) return

  const merged = buildVehicleConcepts(generatePlan.value)
  const issues = validateConcepts(merged.concepts)
  if (issues.length) {
    ElMessage.error(issues[0]!.message)
    return
  }

  generating.value = true
  try {
    const fileName = `${vehicle.replace(/[\\/:*?"<>|]/g, '_')}-SLOT.cpt`
    const outcome = await api.generateSlot(fileName, serializeConcepts(merged.concepts))
    if (outcome.saved) {
      ElMessage.success(`已生成 ${outcome.saved.filePath}（${summarizeMerge(merged)}）`)
      await conceptsStore.load()
    } else {
      ElMessage.error(outcome.error ?? '生成 SLOT cpt 失败')
    }
  } finally {
    generating.value = false
  }
}
</script>

<!--
  @grid A：标题 6 · 视图切换 6；详情左列表 3 · 右详情 9。
  总览是动态列数的原生表格，列随映射文件数量增减，横向超出在表格内部滚动；音源类型列冻结在左。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-6 flex items-center gap-2">
          <h1 class="text-lg font-medium text-ink">SLOT 映射</h1>
          <el-tag v-if="store.errorPlanCount" size="small" type="warning" effect="plain">
            {{ store.errorPlanCount }} 个文件异常
          </el-tag>
        </div>
        <div class="col-span-6 flex items-center justify-end gap-2">
          <el-button size="small" :disabled="!canEdit" @click="openCreatePlan">新建方案</el-button>
          <el-button
            size="small"
            type="primary"
            :loading="generating"
            :disabled="!canGenerate"
            @click="generateSlotCpt"
          >
            按车型生成 CPT
          </el-button>
          <el-segmented
            v-model="viewMode"
            size="small"
            :options="[
              { label: '总览', value: 'overview' },
              { label: '详情', value: 'detail' },
            ]"
          />
        </div>
      </div>

      <!-- 车型 + 音源类型筛选 -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
        <div class="col-span-3">
          <el-select
            v-model="vehicleFilter"
            size="small"
            clearable
            filterable
            placeholder="车型：全部"
            class="w-full"
          >
            <el-option
              v-for="vehicle in vehicleOptions"
              :key="vehicle"
              :label="vehicle"
              :value="vehicle"
            />
          </el-select>
        </div>
        <div class="col-span-3">
          <el-select
            v-model="sourceFilter"
            size="small"
            clearable
            placeholder="音源类型：全部"
            class="w-full"
          >
            <el-option v-for="title in sourceOptions" :key="title" :label="title" :value="title" />
          </el-select>
        </div>
      </div>
    </div>

    <el-alert
      v-if="store.unconfigured"
      type="info"
      :closable="false"
      title="还没有配置 SLOT 映射目录"
      description="请在项目设置里指定 SLOT 映射目录（如 config/SLOT映射）。"
    />

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="目录内容不可用，修正后重试即可。"
    />

    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取 SLOT 映射…</p>
      <el-empty v-else-if="!store.hasData" description="该目录下还没有 SLOT 映射 txt 文件" />
      <el-empty v-else-if="!visiblePlans.length" description="未找到适用该车型的映射" />

      <!--
        总览矩阵：音源类型列固定在左侧，方案名过长时截断（完整名在提示里），
        横向滚动看后面的方案时仍能对上音源行，不会因为方案名太长而一直往右拖。
      -->
      <div v-else-if="viewMode === 'overview'" class="max-h-[60vh] overflow-auto border border-line">
        <table
          class="w-full min-w-max table-fixed border-separate border-spacing-0 text-center text-[11px] text-ink"
        >
          <thead>
            <tr>
              <th
                class="sticky top-0 left-0 z-30 w-32 border-b border-r border-line bg-surface-soft px-2 py-2 text-left font-medium"
              >
                音源类型
              </th>
              <th
                v-for="plan in visiblePlans"
                :key="plan.name"
                class="sticky top-0 z-20 w-32 border-b border-r border-line bg-surface-soft px-2 py-2 font-medium"
                :title="displayName(plan.name)"
              >
                <span class="block truncate">{{ displayName(plan.name) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="title in titles" :key="title">
              <th
                class="sticky left-0 z-10 w-32 border-b border-r border-line bg-surface px-2 py-2 text-left font-medium"
              >
                <span class="block truncate" :title="title">{{ title }}</span>
              </th>
              <td
                v-for="plan in visiblePlans"
                :key="plan.name"
                class="w-32 border-b border-r border-line bg-surface px-2 py-2 text-center whitespace-nowrap"
                :title="formatSlots(scenarioSlots(plan, title))"
              >
                {{ formatSlots(scenarioSlots(plan, title)) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 详情：左方案列表 + 右文件详情 -->
      <div v-else class="grid grid-cols-12 gap-3">
        <div class="col-span-3">
          <div class="flex max-h-[60vh] flex-col overflow-y-auto border border-line">
            <button
              v-for="plan in visiblePlans"
              :key="plan.name"
              type="button"
              class="border-b border-line px-3 py-2 text-left text-[11px] break-all outline-none last:border-b-0 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary/40"
              :class="selectedPlan?.name === plan.name ? 'bg-surface-soft text-primary-ink font-medium' : 'text-ink'"
              @click="selectedName = plan.name"
            >
              {{ displayName(plan.name) }}
            </button>
          </div>
        </div>

        <div class="col-span-9 min-w-0">
          <div v-if="selectedPlan" class="border border-line">
            <div class="grid grid-cols-12 items-center border-b border-line bg-surface-soft px-3 py-2">
              <h2 class="col-span-8 text-[13px] font-medium break-all text-ink">
                {{ displayName(selectedPlan.name) }}
              </h2>
              <div class="col-span-4 flex justify-end gap-1">
                <el-button size="small" link type="primary" @click="openEditPlan(selectedPlan)">
                  编辑
                </el-button>
                <el-button size="small" link type="danger" @click="removePlan(selectedPlan)">
                  删除
                </el-button>
              </div>
            </div>
            <div class="border-b border-line px-3 py-2 text-[11px] break-all text-ink">
              适用车型：{{ selectedPlan.vehicles.join('/') || '—' }}
            </div>
            <el-alert
              v-if="selectedPlan.error"
              type="warning"
              :closable="false"
              :title="selectedPlan.error"
            />
            <div
              v-for="scenario in selectedScenarios"
              :key="scenario.title"
              class="grid grid-cols-12 items-center border-b border-line/60 last:border-b-0"
            >
              <p class="col-span-8 min-w-0 truncate px-3 py-2 text-[11px] text-ink" :title="scenario.title">
                {{ scenario.title }}
              </p>
              <p class="col-span-4 px-3 py-2 text-center text-[11px] whitespace-nowrap text-ink">
                {{ formatSlots(scenario.slots) }}
              </p>
            </div>
            <p
              v-if="!selectedPlan.scenarios.length && !selectedPlan.error"
              class="px-3 py-3 text-[11px] text-ink-muted"
            >
              文件中没有解析到音源场景
            </p>
          </div>
        </div>
      </div>
    </div>

    <SlotPlanFormDialog v-model="formVisible" :plan="editingPlan" />
  </div>
</template>
