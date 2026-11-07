<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSlotMapStore } from '@/stores/slotMap'
import { formatSlots, scenarioSlots, sourceTitles } from '@/stores/slot-map-format'

/**
 * SLOT 映射：目录下每个 txt 是一种映射方案。
 * 总览按「音源 × 映射方案」展示；详情左侧方案列表，右侧车型与音源 SLOT。
 */
const store = useSlotMapStore()
const viewMode = ref<'overview' | 'detail'>('overview')
const selectedName = ref('')

const titles = computed(() => sourceTitles(store.plans))
const selectedPlan = computed(
  () => store.plans.find((plan) => plan.name === selectedName.value) ?? store.plans[0] ?? null,
)

watch(
  () => store.plans,
  (plans) => {
    if (!plans.some((plan) => plan.name === selectedName.value)) {
      selectedName.value = plans[0]?.name ?? ''
    }
  },
  { immediate: true },
)
</script>

<!--
  @grid A：标题 6 · 视图切换 6；详情左列表 3 · 右详情 9。
  总览是动态列数的原生表格，列随映射文件数量增减，横向超出在表格内部滚动。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-6 flex items-center gap-2">
          <h1 class="text-lg font-medium text-ink">SLOT 映射</h1>
          <el-tag size="small" type="info" effect="plain">{{ store.planCount }} 个映射</el-tag>
          <el-tag v-if="store.errorPlanCount" size="small" type="warning" effect="plain">
            {{ store.errorPlanCount }} 个文件异常
          </el-tag>
        </div>
        <div class="col-span-6 justify-self-end">
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

      <!-- 总览矩阵 -->
      <div v-else-if="viewMode === 'overview'" class="overflow-x-auto border border-line">
        <table class="w-full min-w-max border-collapse text-left text-[11px] text-ink">
          <thead class="bg-surface-soft">
            <tr>
              <th class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap">
                音源类型
              </th>
              <th
                v-for="plan in store.plans"
                :key="plan.name"
                class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap last:border-r-0"
                :title="plan.filePath"
              >
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="title in titles" :key="title">
              <th class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap">
                {{ title }}
              </th>
              <td
                v-for="plan in store.plans"
                :key="plan.name"
                class="border-b border-r border-line px-3 py-2 text-center whitespace-nowrap last:border-r-0"
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
              v-for="plan in store.plans"
              :key="plan.name"
              type="button"
              class="border-b border-line px-3 py-2 text-left text-[11px] break-all outline-none last:border-b-0 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary/40"
              :class="selectedPlan?.name === plan.name ? 'bg-surface-soft text-primary' : 'text-ink'"
              @click="selectedName = plan.name"
            >
              {{ plan.name }}
            </button>
          </div>
        </div>

        <div class="col-span-9 min-w-0">
          <div v-if="selectedPlan" class="border border-line">
            <div class="border-b border-line bg-surface-soft px-3 py-2">
              <h2 class="text-[13px] font-medium break-all text-ink">{{ selectedPlan.name }}</h2>
              <p class="mt-1 text-[11px] break-all text-ink-muted">
                适用车型：{{ selectedPlan.vehicles.join('/') || '—' }}
              </p>
            </div>
            <el-alert
              v-if="selectedPlan.error"
              type="warning"
              :closable="false"
              :title="selectedPlan.error"
            />
            <div
              v-for="scenario in selectedPlan.scenarios"
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
  </div>
</template>
