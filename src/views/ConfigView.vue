<script setup lang="ts">
import { computed, ref } from 'vue'
import ConfigurationFormDialog from '@/components/ConfigurationFormDialog.vue'
import ConfigurationTable from '@/components/ConfigurationTable.vue'
import ConfigValueFormDialog from '@/components/ConfigValueFormDialog.vue'
import { useConfigsStore } from '@/stores/configs'
import type { ConfigurationValueRow } from '@/stores/configs'
import { useRequirementsStore } from '@/stores/requirements'

/**
 * 配置参数页：配置项列表 → 展开配置值 → 关联需求变体或直接填车型。
 * 数据由 store 在应用启动 / 切换项目时从 `.hil-kit/config.json` 读回，每次保存后重新读取。
 */
const store = useConfigsStore()
const requirementsStore = useRequirementsStore()

const keyword = ref('')
const configurationVisible = ref(false)
const editingConfiguration = ref<string | null>(null)
const valueVisible = ref(false)
const valueConfigKey = ref('')
const editingValue = ref<ConfigurationValueRow | null>(null)

const available = computed(() => Boolean(window.desktop?.configs))

const filteredRows = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return store.rows

  return store.rows.filter((row) => {
    if (row.config_key.toLowerCase().includes(query)) return true
    return row.values.some((value) => {
      if (value.value.toLowerCase().includes(query)) return true
      if (value.resolved.vehicles.some((vehicle) => vehicle.toLowerCase().includes(query))) {
        return true
      }
      return value.resolved.refs.some((ref) =>
        ref.requirement_name.toLowerCase().includes(query),
      )
    })
  })
})

/** 变体引用失效 / 歧义的配置值数量，用于页面顶部提醒 */
const pendingIssueCount = computed(() =>
  store.rows.reduce((sum, row) => sum + row.issueCount, 0),
)

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的配置项' : '该项目还没有配置参数',
)

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
  @grid A：标题行（标题 + 统计 + 新增按钮）与工具栏（搜索 + 更新时间）都是 Row 下按比例分列，
  按钮组按 B 方案整组占一列，列表区整块占一栏。
-->
<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">配置参数</h1>
        <el-tag size="small" type="info" effect="plain">
          {{ store.configurationCount }} 个配置项
        </el-tag>
        <el-tag size="small" type="info" effect="plain">
          {{ store.configValueCount }} 个配置值
        </el-tag>
        <el-tag size="small" type="info" effect="plain"> {{ store.vehicleCount }} 款车型 </el-tag>
        <el-tag v-if="pendingIssueCount" size="small" type="warning" effect="plain">
          {{ pendingIssueCount }} 个引用待处理
        </el-tag>
      </div>
      <div v-if="available" class="col-span-5 justify-self-end">
        <el-button size="small" type="primary" @click="openCreateConfiguration">
          新增配置项
        </el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="搜索配置项、配置值、车型或需求名称"
        />
      </div>
      <p class="col-span-5 justify-self-end text-[11px] text-ink-muted">
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

    <!-- @grid B：列表区整块占一栏 -->
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
