<script setup lang="ts">
import { computed, ref } from 'vue'
import RequirementImportDialog from '@/components/RequirementImportDialog.vue'
import RequirementTable from '@/components/RequirementTable.vue'
import { useRequirementsStore } from '@/stores/requirements'

/**
 * 需求页（参考 tauri-app 的需求管理页）：统计 + 搜索 + 需求表，导入走弹窗。
 * 数据由 store 在应用启动 / 切换项目时从项目目录读回，导入成功后刷新。
 */
const store = useRequirementsStore()
const importVisible = ref(false)
const keyword = ref('')

const available = computed(() => Boolean(window.desktop?.requirements))

const filteredRequirements = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  const requirements = store.document?.requirements ?? []
  if (!query) return requirements
  return requirements.filter(
    (item) => item.id.toLowerCase().includes(query) || item.name.toLowerCase().includes(query),
  )
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的需求' : '该项目还没有导入需求',
)

// ISO 存 UTC，界面按本地时间展示
function formatTime(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

async function onImported() {
  await store.load()
}
</script>

<!--
  @grid A：标题行（标题 + 统计 + 导入按钮）与工具栏（搜索 + 更新时间）都是 Row 下按比例分列，
  按钮组按 B 方案整组占一列。
-->
<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-6 flex items-center gap-2">
        <h1 class="text-lg font-medium text-ink">需求</h1>
        <el-tag size="small" type="info" effect="plain">
          {{ store.requirementCount }} 个需求
        </el-tag>
        <el-tag size="small" type="info" effect="plain"> {{ store.variantCount }} 个变体 </el-tag>
      </div>
      <div v-if="available" class="col-span-6 justify-self-end">
        <el-button size="small" type="primary" @click="importVisible = true">导入 Excel</el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索需求ID或名称" />
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

    <!-- @grid B：列表区整块占一栏 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取已保存的需求…</p>
        <RequirementTable
          v-else-if="filteredRequirements.length"
          :requirements="filteredRequirements"
        />
        <el-empty v-else :description="emptyText" />
      </div>
    </div>

    <RequirementImportDialog v-model="importVisible" @imported="onImported" />
  </div>
</template>
