<script setup lang="ts">
import { computed, ref } from 'vue'
import RequirementImportDialog from '@/components/RequirementImportDialog.vue'
import RequirementAssociationTable from '@/components/RequirementAssociationTable.vue'
import { useConfigsStore } from '@/stores/configs'
import { useRequirementsStore } from '@/stores/requirements'
import { useRequirementMappingStore } from '@/stores/requirement-mapping'
import {
  analyzeRequirementAssociation,
  missingRequirementNames,
  type RequirementAssociationStatus,
} from '@/stores/requirement-association'

/**
 * 需求页（参考 tauri-app 的需求管理页）：统计 + 搜索 + 需求表，导入走弹窗。
 * 数据由 store 在应用启动 / 切换项目时从项目目录读回，导入成功后刷新。
 */
const store = useRequirementsStore()
const configsStore = useConfigsStore()
const mappingStore = useRequirementMappingStore()
const importVisible = ref(false)
const keyword = ref('')
const vehicleFilter = ref('')
const requirementStatusFilter = ref<RequirementAssociationStatus[]>([])
const variantStatusFilter = ref<'' | 'linked' | 'unlinked'>('')

const available = computed(() => Boolean(window.desktop?.requirements))

const statusOptions: { value: RequirementAssociationStatus; label: string }[] = [
  { value: 'normal', label: '正常' },
  { value: 'unlinked', label: '未关联' },
  { value: 'variant_added', label: '变体增加' },
  { value: 'variant_removed', label: '变体删除' },
  { value: 'variant_changed', label: '变体变更' },
]

/** 车型筛选候选：需求各变体适用车型去重 */
const vehicleOptions = computed(() => {
  const names = new Set<string>()
  for (const requirement of store.document?.requirements ?? []) {
    for (const variant of requirement.variants) {
      for (const vehicle of variant.vehicles) names.add(vehicle)
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const filteredRequirements = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return (store.document?.requirements ?? []).filter((item) => {
    if (query && !item.name.toLowerCase().includes(query)) return false
    if (
      vehicleFilter.value &&
      !item.variants.some((variant) => variant.vehicles.includes(vehicleFilter.value))
    ) {
      return false
    }

    const association = analyzeRequirementAssociation(
      item,
      configsStore.configurations,
      mappingStore.isParticipating(item.id),
    )
    if (
      requirementStatusFilter.value.length &&
      !requirementStatusFilter.value.includes(association.status)
    ) {
      return false
    }
    if (variantStatusFilter.value === 'linked' && !association.linkedKeys.length) return false
    if (variantStatusFilter.value === 'unlinked' && !association.unlinkedKeys.length) return false
    return true
  })
})

const emptyText = computed(() =>
  keyword.value.trim() ||
  vehicleFilter.value ||
  requirementStatusFilter.value.length ||
  variantStatusFilter.value
    ? '未找到匹配的需求'
    : '该项目还没有导入需求',
)

/** 配置值仍引用、但当前需求列表已不存在的需求 */
const orphanNames = computed(() =>
  missingRequirementNames(store.document?.requirements ?? [], configsStore.configurations),
)

async function onImported() {
  await store.load()
}
</script>

<!--
  @grid A：标题、筛选、表格共用 11.5/12 内容宽，导入按钮与表格右缘对齐。
  标题 6 · 导入 6；需求名称 3 · 车型 2 · 需求状态 4 · 变体状态 3。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <!-- 标题行 -->
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-6 flex items-center">
          <h1 class="text-lg font-medium text-ink">软件需求</h1>
        </div>
        <div v-if="available" class="col-span-6 justify-self-end">
          <el-button size="small" type="primary" @click="importVisible = true">导入 Excel</el-button>
        </div>
      </div>

      <!-- 工具栏：名称 + 车型 + 需求状态多选 + 变体状态单选 -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
        <div class="col-span-3">
          <el-input v-model="keyword" size="small" clearable placeholder="需求名称" />
        </div>
        <div class="col-span-2">
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
        <div class="col-span-4">
          <el-select
            v-model="requirementStatusFilter"
            size="small"
            multiple
            clearable
            collapse-tags
            collapse-tags-tooltip
            :max-collapse-tags="1"
            placeholder="需求关联状态：全部"
            class="w-full"
          >
            <el-option
              v-for="option in statusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </div>
        <div class="col-span-3">
          <el-select
            v-model="variantStatusFilter"
            size="small"
            clearable
            placeholder="变体关联状态：全部"
            class="w-full"
          >
            <el-option label="已关联" value="linked" />
            <el-option label="未关联" value="unlinked" />
          </el-select>
        </div>
      </div>
    </div>

    <el-alert
      v-if="!available"
      type="info"
      :closable="false"
      title="需求导入只在桌面端可用"
      description="解析 Excel 与读写项目目录需要 Electron 主进程，请通过 npm run dev 或安装包启动。"
    />

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="文件内容不可用，重新导入一次即可覆盖。"
    />

    <el-alert
      v-if="orphanNames.length"
      type="warning"
      show-icon
      :closable="false"
      :title="`有 ${orphanNames.length} 个被配置值引用的需求已不存在`"
      :description="orphanNames.join('、')"
    />

    <!-- 列表区：与配置参数页同宽，右缘对齐第 12 栅格中线 -->
    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取已保存的需求…</p>
      <RequirementAssociationTable
        v-else-if="filteredRequirements.length"
        :requirements="filteredRequirements"
        :variant-status="variantStatusFilter"
      />
      <el-empty v-else :description="emptyText" />
    </div>

    <RequirementImportDialog v-model="importVisible" @imported="onImported" />
  </div>
</template>
