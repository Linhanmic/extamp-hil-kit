<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSnapshotStore } from '@/stores/snapshot'

/**
 * 快照页：列出扬声器快照目录下的所有快照文件，展示每个文件的通道对应关系。
 * 数据由 store 读回，只做展示。
 */
const store = useSnapshotStore()
const keyword = ref('')

const filteredFiles = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return store.files
  return store.files.filter((file) => file.name.toLowerCase().includes(query))
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的快照文件' : '该项目还没有扬声器快照',
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-12 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">快照</h1>
        <el-tag size="small" type="info" effect="plain">{{ store.fileCount }} 个文件</el-tag>
        <el-tag size="small" type="info" effect="plain">{{ store.channelCount }} 个通道</el-tag>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索快照文件名" />
      </div>
    </div>

    <el-alert
      v-if="store.unconfigured"
      type="info"
      :closable="false"
      title="还没有配置扬声器快照目录"
      description="请在项目设置里指定扬声器快照目录（如 config/扬声器快照）。"
    />

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="目录不可用，修正后重试即可。"
    />

    <!-- 列表区 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取扬声器快照…</p>
        <div v-else-if="filteredFiles.length" class="flex flex-col gap-2">
          <div
            v-for="file in filteredFiles"
            :key="file.name"
            class="rounded-lg border border-line bg-surface p-3"
          >
            <h2 class="text-sm font-medium text-ink">{{ file.name }}</h2>
            <div v-if="file.channels.length" class="mt-2 flex flex-col gap-1">
              <div
                v-for="channel in file.channels"
                :key="channel.channel"
                class="grid grid-cols-12 items-center gap-2 rounded-md bg-surface px-2 py-1"
              >
                <span class="col-span-3 text-[11px] font-medium text-ink">
                  {{ channel.channel }}
                </span>
                <span class="col-span-9 text-[11px] text-ink-muted">{{ channel.speaker }}</span>
              </div>
            </div>
            <p v-else class="mt-2 text-[11px] text-ink-muted">（空文件）</p>
          </div>
        </div>
        <el-empty v-else :description="emptyText" />
      </div>
    </div>
  </div>
</template>
