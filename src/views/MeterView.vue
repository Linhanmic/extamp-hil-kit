<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMeterStore } from '@/stores/meter'

/**
 * 音量表页：展示音量表文件里的「车型 × 音源 × 音量档位」表格。数据由 store 读回，只做展示。
 */
const store = useMeterStore()
const keyword = ref('')

const filteredRows = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return store.rows
  return store.rows.filter(
    (row) =>
      row.vehicle.toLowerCase().includes(query) || row.source.toLowerCase().includes(query),
  )
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的音量表行' : '该项目还没有音量表数据',
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-12 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">音量表</h1>
        <el-tag size="small" type="info" effect="plain">{{ store.rowCount }} 行</el-tag>
        <el-tag size="small" type="info" effect="plain">{{ store.vehicleCount }} 款车型</el-tag>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索车型或音源" />
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

    <!-- 列表区 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取音量表…</p>
        <el-table
          v-else-if="filteredRows.length"
          :data="filteredRows"
          size="small"
          max-height="480"
        >
          <el-table-column prop="vehicle" label="车型" min-width="120" show-overflow-tooltip />
          <el-table-column prop="source" label="音源" min-width="100" show-overflow-tooltip />
          <el-table-column
            v-for="(level, index) in store.levels"
            :key="level"
            :label="level"
            min-width="72"
            align="center"
          >
            <template #default="{ row }">{{ row.values[index] }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-else :description="emptyText" />
      </div>
    </div>
  </div>
</template>
