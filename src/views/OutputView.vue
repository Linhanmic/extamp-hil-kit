<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useOutputStore } from '@/stores/output'
import { useConceptsStore } from '@/stores/concepts'
import { serializeConcepts, validateConcepts } from '@/spec/concept-file'
import {
  buildVehicleConcepts,
  planOutputConcepts,
  summarizeMerge,
} from '@/composables/vehicle-assets'
import OutputScenarioFormDialog from '@/components/OutputScenarioFormDialog.vue'
import type { OutputScenario } from '@/models'

/**
 * 出声位置：场景文本 + 车型单选筛选。
 * 场景下方为适用车型，底部为出声 / 不出声扬声器关键字。
 */
const store = useOutputStore()
const conceptsStore = useConceptsStore()
const keyword = ref('')
const vehicleFilter = ref('')
const generating = ref(false)

const vehicleOptions = computed(() => {
  const names = new Set<string>()
  for (const scenario of store.scenarios) {
    for (const vehicle of scenario.vehicles) names.add(vehicle)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredScenarios = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return store.scenarios.filter((scenario) => {
    if (query && !scenario.title.toLowerCase().includes(query)) return false
    if (
      vehicleFilter.value &&
      !scenario.allVehicles &&
      !scenario.vehicles.includes(vehicleFilter.value)
    ) {
      return false
    }
    return true
  })
})

const emptyText = computed(() =>
  keyword.value.trim() || vehicleFilter.value ? '未找到匹配的检查场景' : '该项目还没有出声位置数据',
)

function vehicleText(scenario: { allVehicles: boolean; vehicles: string[] }): string {
  return scenario.allVehicles ? '全部车型' : scenario.vehicles.join('/') || '—'
}

function keywordText(keywords: string[]): string {
  return keywords.length ? keywords.join('、') : '-'
}

/** 场景增删改：编辑传下标，新增传 null */
const formVisible = ref(false)
const editingScenario = ref<OutputScenario | null>(null)
const editingIndex = ref<number | null>(null)

function openCreateScenario() {
  editingScenario.value = null
  editingIndex.value = null
  formVisible.value = true
}

function openEditScenario(scenario: OutputScenario) {
  const index = store.scenarios.indexOf(scenario)
  if (index < 0) return
  editingScenario.value = scenario
  editingIndex.value = index
  formVisible.value = true
}

async function removeScenario(scenario: OutputScenario) {
  const index = store.scenarios.indexOf(scenario)
  if (index < 0) return
  try {
    await ElMessageBox.confirm(`确定删除场景「${scenario.title || '未命名场景'}」？`, '删除场景', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const result = await store.removeScenario(index)
  if (result.ok) ElMessage.success('场景已删除')
  else ElMessage.error(result.error)
}

/** 生成只看磁盘数据与当前车型，不受页面筛选影响 */
const generatePlan = computed(() => planOutputConcepts(store.scenarios, vehicleFilter.value))
const canGenerate = computed(
  () => Boolean(vehicleFilter.value) && generatePlan.value.defaults.length + generatePlan.value.vehicleSpecific.length > 0,
)

/** 按当前车型生成 cpt：默认项 + 车型差异项，同名默认项由车型版本替换 */
async function generateVehicleCpt() {
  const vehicle = vehicleFilter.value
  const api = window.desktop?.concepts
  if (!vehicle || !api?.generate) return

  const merged = buildVehicleConcepts(generatePlan.value)
  const issues = validateConcepts(merged.concepts)
  if (issues.length) {
    ElMessage.error(issues[0]!.message)
    return
  }

  generating.value = true
  try {
    const fileName = `${vehicle.replace(/[\\/:*?"<>|]/g, '_')}.cpt`
    const outcome = await api.generate(fileName, serializeConcepts(merged.concepts))
    if (outcome.saved) {
      ElMessage.success(`已生成 ${outcome.saved.filePath}（${summarizeMerge(merged)}）`)
      await conceptsStore.load()
    } else {
      ElMessage.error(outcome.error ?? '生成 cpt 失败')
    }
  } finally {
    generating.value = false
  }
}
</script>

<!--
  @grid A：标题 12；场景文本 4 · 车型单选 3。
  场景卡片内部按 标题 → 车型 → 步骤 → 出声关键字 → 不出声关键字排列。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-6">
          <h1 class="text-lg font-medium text-ink">出声位置</h1>
        </div>
        <div class="col-span-2">
          <el-button size="small" @click="openCreateScenario">新增场景</el-button>
        </div>
        <div class="col-span-4 justify-self-end">
          <el-button
            size="small"
            type="primary"
            :loading="generating"
            :disabled="!canGenerate"
            @click="generateVehicleCpt"
          >
            按车型生成 CPT
          </el-button>
        </div>
      </div>

      <!-- 场景文本 + 车型单选 -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
        <div class="col-span-4">
          <el-input v-model="keyword" size="small" clearable placeholder="场景" />
        </div>
        <div class="col-span-3">
          <el-select
            v-model="vehicleFilter"
            size="small"
            clearable
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
      </div>
    </div>

    <el-alert
      v-if="store.unconfigured"
      type="info"
      :closable="false"
      title="还没有配置出声位置文件"
      description="请在项目设置里指定出声位置文件（如 config/出声位置/出声位置.txt）。"
    />

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="文件内容不可用，修正后重试即可。"
    />

    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取出声位置…</p>
      <div v-else-if="filteredScenarios.length" class="flex flex-col gap-2">
        <div
          v-for="(scenario, index) in filteredScenarios"
          :key="index"
          class="rounded-lg border border-line bg-surface p-3"
        >
          <h2 class="text-sm font-medium text-ink">
            {{ scenario.title || '（未命名场景）' }}
          </h2>
          <div class="mt-1 grid grid-cols-12 items-center gap-2">
            <p
              class="col-span-9 min-w-0 truncate text-[11px] text-ink-muted"
              :title="vehicleText(scenario)"
            >
              适用车型：{{ vehicleText(scenario) }}
            </p>
            <div class="col-span-3 flex justify-end gap-1">
              <el-button size="small" link type="primary" @click="openEditScenario(scenario)">
                编辑
              </el-button>
              <el-button size="small" link type="danger" @click="removeScenario(scenario)">
                删除
              </el-button>
            </div>
          </div>

          <ol v-if="scenario.steps.length" class="mt-2 flex flex-col gap-0.5">
            <li
              v-for="(step, stepIndex) in scenario.steps"
              :key="stepIndex"
              class="text-[11px] leading-relaxed break-all text-ink-muted"
            >
              {{ stepIndex + 1 }}. {{ step }}
            </li>
          </ol>

          <p class="mt-2 text-[11px] leading-relaxed break-all text-ink">
            出声扬声器关键字：{{ keywordText(scenario.speakKeywords) }}
          </p>
          <p class="mt-1 text-[11px] leading-relaxed break-all text-ink">
            不出声扬声器关键字：{{ keywordText(scenario.noSpeakKeywords) }}
          </p>
        </div>
      </div>
      <el-empty v-else :description="emptyText" />
    </div>

    <OutputScenarioFormDialog
      v-model="formVisible"
      :scenario="editingScenario"
      :index="editingIndex"
    />
  </div>
</template>
