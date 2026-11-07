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
 * 标题 + 新增 → 配置项筛选 + 车型筛选 → 可展开配置项表（状态 / 操作）。
 * 数据由 store 在应用启动 / 切换项目时从 `.hil-kit/config.json` 读回，每次保存后重新读取。
 */
const store = useConfigsStore()
const requirementsStore = useRequirementsStore()

const keyword = ref('')
const vehicleFilter = ref<string[]>([])
const configurationVisible = ref(false)
const editingConfiguration = ref<string | null>(null)
const valueVisible = ref(false)
const valueConfigKey = ref('')
const editingValue = ref<ConfigurationValueRow | null>(null)

const available = computed(() => Boolean(window.desktop?.configs))

/** 车型筛选候选项：配置值生效车型去重 */
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
 * 过滤逻辑：
 * - 关键字：配置项名 / 配置值 / 车型 / 需求名
 * - 车型：配置值级过滤——只保留含所选车型的配置值；配置项在仍有匹配值或关键字只命中项名时保留
 * 统计徽章仍显示全量，不随筛选跳变。
 */
const filteredRows = computed<ConfigurationRow[]>(() => {
  const query = keyword.value.trim().toLowerCase()
  const vehicles = vehicleFilter.value
  if (!query && !vehicles.length) return store.rows

  return store.rows.flatMap((row) => {
    const keyHit = query ? row.config_key.toLowerCase().includes(query) : false
    const matchedValues = row.values.filter((value) => {
      // 车型多选：命中任一所选车型即可（OR），与关键字 AND
      const vehicleOrHit =
        !vehicles.length || vehicles.some((vehicle) => value.resolved.vehicles.includes(vehicle))
      if (!vehicleOrHit) return false
      if (!query) return true
      if (value.value.toLowerCase().includes(query)) return true
      if (value.resolved.vehicles.some((vehicle) => vehicle.toLowerCase().includes(query))) {
        return true
      }
      return value.resolved.refs.some((ref) =>
        ref.requirement_name.toLowerCase().includes(query),
      )
    })

    if (matchedValues.length) {
      return [{ ...row, values: matchedValues, valueCount: matchedValues.length }]
    }
    // 关键字只命中配置项名、且未按车型排除时保留空壳行（仍可编辑配置项）
    if (keyHit && !vehicles.length) return [row]
    return []
  })
})

const emptyText = computed(() => {
  if (keyword.value.trim() || vehicleFilter.value.length) return '未找到匹配的配置项'
  return '该项目还没有配置参数'
})

// ISO 存 UTC，界面按本地时间展示
function formatTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

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
</script>

<!--
  @grid A：标题行（标题 + 新增）、筛选行（配置项 + 车型 + 更新时间）、列表区均为 12 列 Row。
  筛选：配置项 6 · 车型 4 · 更新时间 2；标题：标题 8 · 新增 4。
-->
<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行：配置参数 · 新增配置参数 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-8 flex min-w-0 items-center gap-2">
        <h1 class="text-lg font-medium text-ink">配置参数</h1>
        <el-tag size="small" type="info" effect="plain">
          {{ store.configurationCount }} 个配置项
        </el-tag>
        <el-tag size="small" type="info" effect="plain">
          {{ store.configValueCount }} 个配置值
        </el-tag>
        <el-tag size="small" type="info" effect="plain">
          {{ store.vehicleCount }} 款车型
        </el-tag>
      </div>
      <div v-if="available" class="col-span-4 justify-self-end">
        <el-button size="small" type="primary" @click="openCreateConfiguration">
          新增配置参数
        </el-button>
      </div>
    </div>

    <!-- 筛选行：配置项筛选区 · 车型筛选区 · 最近更新 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-6">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="配置项筛选：名称、配置值、车型或需求"
        />
      </div>
      <div class="col-span-4">
        <el-select
          v-model="vehicleFilter"
          size="small"
          multiple
          clearable
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="2"
          placeholder="车型筛选：全部车型"
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
      <p class="col-span-2 justify-self-end text-[11px] text-ink-muted">
        <template v-if="store.hasData">
          最近更新 {{ formatTime(store.document?.updatedAt) }}
        </template>
      </p>
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
      title="还没有导入需求，配置值只能手工填写车型"
      description="导入需求分析表后，配置值可以关联需求变体，适用车型会自动跟着需求数据更新。"
    />

    <!-- 列表区：整块占 12 列 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取已保存的配置参数…</p>
        <ConfigurationTable
          v-else-if="filteredRows.length"
          :rows="filteredRows"
          @add-value="openCreateValue"
          @edit-configuration="openEditConfiguration"
          @delete-configuration="store.removeConfiguration"
          @edit-value="openEditValue"
          @delete-value="store.removeConfigValue"
        />
        <el-empty v-else :description="emptyText" />
      </div>
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
