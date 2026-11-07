<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfigurationFormDialog from '@/components/ConfigurationFormDialog.vue'
import ConfigurationTable from '@/components/ConfigurationTable.vue'
import ConfigValueFormDialog from '@/components/ConfigValueFormDialog.vue'
import { useConfigsStore } from '@/stores/configs'
import type { ConfigurationRow, ConfigurationValueRow } from '@/stores/configs'
import { useRequirementsStore } from '@/stores/requirements'

/**
 * 配置参数页（对齐 Excel 结构稿）：
 * 标题 + 新增 → 配置键下拉 · 车型下拉（均单选）→ 可展开配置项表。
 * 列表右缘对齐第 12 栅格中线（宽 11.5/12）。
 * 数据由 store 在应用启动 / 切换项目时从 `.hil-kit/config.json` 读回，每次保存后重新读取。
 */
const store = useConfigsStore()
const requirementsStore = useRequirementsStore()

/** 配置键筛选（单选，空 = 全部） */
const configKeyFilter = ref('')
/** 车型筛选（单选，空 = 全部） */
const vehicleFilter = ref('')
const configurationVisible = ref(false)
const editingConfiguration = ref<string | null>(null)
const valueVisible = ref(false)
const valueConfigKey = ref('')
const editingValue = ref<ConfigurationValueRow | null>(null)

const available = computed(() => Boolean(window.desktop?.configs))

/** 配置键候选项：当前项目全部配置项名称 */
const configKeyOptions = computed(() => store.rows.map((row) => row.config_key))

/** 车型候选项：配置值生效车型去重 */
const vehicleOptions = computed(() => {
  const names: string[] = []
  for (const row of store.rows) {
    for (const value of row.values) {
      for (const vehicle of value.resolved.vehicles) {
        if (vehicle && !names.includes(vehicle)) names.push(vehicle)
      }
    }
  }
  return names.sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

/**
 * 过滤：配置键精确匹配整行；车型在配置值级过滤——只保留含该车型的值。
 */
const filteredRows = computed<ConfigurationRow[]>(() => {
  let rows = store.rows
  if (configKeyFilter.value) {
    rows = rows.filter((row) => row.config_key === configKeyFilter.value)
  }
  if (!vehicleFilter.value) return rows

  return rows.flatMap((row) => {
    const matchedValues = row.values.filter((value) =>
      value.resolved.vehicles.includes(vehicleFilter.value),
    )
    if (!matchedValues.length) return []
    return [{ ...row, values: matchedValues, valueCount: matchedValues.length }]
  })
})

const emptyText = computed(() => {
  if (configKeyFilter.value || vehicleFilter.value) return '未找到匹配的配置项'
  return '该项目还没有配置参数'
})

function openCreateConfiguration() {
  editingConfiguration.value = null
  configurationVisible.value = true
}

function openEditConfiguration(configKey: string) {
  editingConfiguration.value = configKey
  configurationVisible.value = true
}

function openCreateValue(configKey: string) {
  valueConfigKey.value = configKey
  editingValue.value = null
  valueVisible.value = true
}

function openEditValue(configKey: string, value: string) {
  const row = store.rows.find((item) => item.config_key === configKey)
  const found = row?.values.find((item) => item.value === value)
  if (!found) return
  valueConfigKey.value = configKey
  editingValue.value = found
  valueVisible.value = true
}

/** 新增关联变体：打开该配置值表单，在变体区追加引用后保存 */
function openAddVariant(configKey: string, value: string) {
  openEditValue(configKey, value)
}

async function onRemoveVariant(
  configKey: string,
  value: string,
  requirementName: string,
  variantKey: string,
) {
  await store.removeRelayVariant(configKey, value, requirementName, variantKey)
}
</script>

<!--
  @grid A：标题 / 筛选 / 列表共用同一内容宽 11.5/12（右缘 = 第 12 栅格中线），
  标题行与筛选行在该宽度内再建 12 列；标题 8 · 新增 4；筛选配置键 4 · 车型 3。
-->
<template>
  <div class="flex flex-col gap-3">
    <!-- 内容区：统一 11.5/12，保证新增按钮右缘与表格对齐 -->
    <div class="w-[calc(11.5/12*100%)]">
      <!-- 标题行：配置参数 · 新增配置参数（无统计徽章） -->
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-8 flex min-w-0 items-center">
          <h1 class="text-lg font-medium text-ink">配置参数</h1>
        </div>
        <div v-if="available" class="col-span-4 justify-self-end">
          <el-button size="small" type="primary" @click="openCreateConfiguration">
            新增配置参数
          </el-button>
        </div>
      </div>

      <!-- 筛选行：配置键下拉 · 车型下拉（均单选；无最近更新） -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
        <div class="col-span-4">
          <el-select
            v-model="configKeyFilter"
            size="small"
            clearable
            placeholder="配置键：全部"
            class="w-full"
          >
            <el-option
              v-for="key in configKeyOptions"
              :key="key"
              :label="key"
              :value="key"
            />
          </el-select>
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
      v-if="!available"
      type="info"
      :closable="false"
      title="配置参数只在桌面端可保存"
      description="读写项目目录需要 Electron 主进程，请通过 npm run dev 或安装包启动。"
    />

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="文件内容不可用或保存失败，修正后重试即可。"
    />

    <el-alert
      v-if="available && !requirementsStore.hasData && store.hasData"
      type="info"
      :closable="false"
      title="还没有导入需求，特殊车型规则将没有可匹配的车型"
      description="导入需求分析表后，特殊车型规则按需求车型匹配，配置值也可以关联需求变体。"
    />

    <!-- 列表区：与标题/筛选同宽 11.5/12 -->
    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">
        正在读取已保存的配置参数…
      </p>
      <ConfigurationTable
        v-else-if="filteredRows.length"
        :rows="filteredRows"
        @add-value="openCreateValue"
        @edit-configuration="openEditConfiguration"
        @delete-configuration="store.removeConfiguration"
        @edit-value="openEditValue"
        @delete-value="store.removeConfigValue"
        @add-variant="openAddVariant"
        @remove-variant="onRemoveVariant"
      />
      <el-empty v-else :description="emptyText" />
    </div>

    <ConfigurationFormDialog
      v-model="configurationVisible"
      :configuration="editingConfiguration"
    />
    <ConfigValueFormDialog
      v-model="valueVisible"
      :config-key="valueConfigKey"
      :config-value="editingValue"
    />
  </div>
</template>
