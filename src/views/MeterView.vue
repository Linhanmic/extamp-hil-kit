<script setup lang="ts">
import { computed, ref } from 'vue'
import VolumeCurveChart from '@/components/VolumeCurveChart.vue'
import VolumeFormDialog from '@/components/VolumeFormDialog.vue'
import { useMeterStore } from '@/stores/meter'
import {
  buildVolumeCurves,
  canonicalVolumeValues,
  VOLUME_LEVELS,
} from '@/stores/volume-chart'
import type { VolumeTableRow } from '@/models'

/**
 * 音量表：0–39 档位表格 + 按音源分组的音量曲线。
 * 音源类型与车型单选同时作用于两种视图。
 */
const store = useMeterStore()
const viewMode = ref<'table' | 'chart'>('table')
const sourceFilter = ref('')
const vehicleFilter = ref('')
const formVisible = ref(false)
const editingRow = ref<VolumeTableRow | null>(null)
const formLevels = computed(() =>
  store.levels.length ? store.levels : VOLUME_LEVELS.map(String),
)

function openCreate() {
  editingRow.value = null
  formVisible.value = true
}

function openEdit(row: VolumeTableRow) {
  editingRow.value = row
  formVisible.value = true
}

const sourceOptions = computed(() => {
  const sources: string[] = []
  for (const row of store.rows) {
    if (!sources.includes(row.source)) sources.push(row.source)
  }
  return sources
})

function rowVehicles(row: VolumeTableRow): string[] {
  return row.vehicle.split(/[/、,，;；]/).map((vehicle) => vehicle.trim()).filter(Boolean)
}

const vehicleOptions = computed(() => {
  const names = new Set<string>()
  for (const row of store.rows) {
    for (const vehicle of rowVehicles(row)) names.add(vehicle)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredRows = computed(() =>
  store.rows.filter((row) => {
    if (sourceFilter.value && row.source !== sourceFilter.value) return false
    if (vehicleFilter.value && !rowVehicles(row).includes(vehicleFilter.value)) return false
    return true
  }),
)

const chartGroups = computed(() => {
  const groups: { source: string; curves: ReturnType<typeof buildVolumeCurves> }[] = []
  for (const row of filteredRows.value) {
    let group = groups.find((item) => item.source === row.source)
    if (!group) {
      group = { source: row.source, curves: [] }
      groups.push(group)
    }
  }
  return groups.map((group) => ({
    source: group.source,
    curves: buildVolumeCurves(
      filteredRows.value.filter((row) => row.source === group.source),
      store.levels,
    ),
  }))
})

const emptyText = computed(() =>
  sourceFilter.value || vehicleFilter.value ? '未找到匹配的音量数据' : '该项目还没有音量表数据',
)
</script>

<!--
  @grid A：标题 6 · 视图切换 6；音源筛选 3 · 车型筛选 3。
  表格 42 列使用原生表格，横向超出在表格内部滚动。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-6">
          <h1 class="text-lg font-medium text-ink">音量表</h1>
        </div>
        <div class="col-span-6 flex items-center justify-end gap-2">
          <el-button size="small" type="primary" @click="openCreate">新增音量</el-button>
          <el-segmented
            v-model="viewMode"
            size="small"
            :options="[
              { label: '表格', value: 'table' },
              { label: '曲线', value: 'chart' },
            ]"
          />
        </div>
      </div>

      <!-- 车型 + 音源类型筛选，均为单选 -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
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
        <div class="col-span-3">
          <el-select
            v-model="sourceFilter"
            size="small"
            clearable
            placeholder="音源类型：全部"
            class="w-full"
          >
            <el-option v-for="source in sourceOptions" :key="source" :label="source" :value="source" />
          </el-select>
        </div>
      </div>
    </div>

    <el-alert
      v-if="store.unconfigured"
      type="info"
      :closable="false"
      title="还没有配置音量表文件"
      description="请在项目设置里指定音量表文件（如 config/音量表/test.csv）。"
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
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取音量表…</p>
      <el-empty v-else-if="!filteredRows.length" :description="emptyText" />

      <!-- 0–39 表格 -->
      <div v-else-if="viewMode === 'table'" class="overflow-x-auto border border-line">
        <table class="w-full min-w-max border-collapse text-center text-[11px] text-ink">
          <thead class="bg-surface-soft">
            <tr>
              <th class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap">车型</th>
              <th class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap">音源类型</th>
              <th
                v-for="level in VOLUME_LEVELS"
                :key="level"
                class="border-b border-r border-line px-2 py-2 font-medium last:border-r-0"
              >
                {{ level }}
              </th>
              <th class="border-b border-line px-3 py-2 font-medium whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRows" :key="`${row.vehicle}-${row.source}`">
              <th class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap">
                {{ row.vehicle }}
              </th>
              <th class="border-b border-r border-line px-3 py-2 font-medium whitespace-nowrap">
                {{ row.source }}
              </th>
              <td
                v-for="(value, level) in canonicalVolumeValues(row, store.levels)"
                :key="level"
                class="border-b border-r border-line px-2 py-1.5 whitespace-nowrap last:border-r-0"
              >
                {{ value }}
              </td>
              <td class="border-b border-line px-2 py-1.5 whitespace-nowrap">
                <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 每种音源一个图表；相同数值的车型曲线已合并 -->
      <div v-else class="flex flex-col gap-3">
        <VolumeCurveChart
          v-for="group in chartGroups"
          :key="group.source"
          :source="group.source"
          :curves="group.curves"
        />
      </div>
    </div>

    <VolumeFormDialog v-model="formVisible" :row="editingRow" :levels="formLevels" />
  </div>
</template>
