<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSlotMapStore } from '@/stores/slotMap'

/**
 * SLOT 映射页：展示 mapping.ini 里每款车型对应的 slot 文件内容。数据由 store 读回，只做展示。
 */
const store = useSlotMapStore()
const keyword = ref('')

const filteredEntries = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return store.entries
  return store.entries.filter((entry) => entry.vehicle.toLowerCase().includes(query))
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的车型' : '该项目还没有 SLOT 映射数据',
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-12 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">SLOT 映射</h1>
        <el-tag size="small" type="info" effect="plain">{{ store.entryCount }} 款车型</el-tag>
        <el-tag v-if="store.missingCount" size="small" type="warning" effect="plain">
          {{ store.missingCount }} 个 slot 文件缺失
        </el-tag>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索车型" />
      </div>
    </div>

    <el-alert
      v-if="store.unconfigured"
      type="info"
      :closable="false"
      title="还没有配置 SLOT 映射配置文件"
      description="请在项目设置里指定 SLOT 映射配置（如 config/SLOT映射/mapping.ini）。"
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
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取 SLOT 映射…</p>
        <div v-else-if="filteredEntries.length" class="flex flex-col gap-2">
          <div
            v-for="entry in filteredEntries"
            :key="entry.vehicle"
            class="rounded-lg border border-line bg-surface p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-ink">{{ entry.vehicle }}</h2>
              <el-tag v-if="entry.missing" size="small" type="warning" effect="plain">
                slot 文件缺失
              </el-tag>
            </div>
            <p class="mt-1 truncate text-[11px] text-ink-muted" :title="entry.filePath">
              {{ entry.filePath }}
            </p>
            <div
              v-if="entry.lines.length"
              class="mt-2 max-h-40 overflow-y-auto rounded-md border border-line bg-surface px-2.5 py-2"
            >
              <p
                v-for="(line, index) in entry.lines"
                :key="index"
                class="text-[11px] leading-relaxed whitespace-pre-wrap text-ink"
              >
                {{ line }}
              </p>
            </div>
          </div>
        </div>
        <el-empty v-else :description="emptyText" />
      </div>
    </div>
  </div>
</template>
