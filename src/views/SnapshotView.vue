<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SnapshotFormDialog from '@/components/SnapshotFormDialog.vue'
import { useSnapshotStore } from '@/stores/snapshot'
import type { SnapshotFile } from '@/models'

/**
 * 快照：统一读取目录下 snapshot.ini。
 * 左侧为 INI 分节名称，右侧为选中分节的适用车型与通道扬声器。
 */
const store = useSnapshotStore()
const selectedIndex = ref(0)
const vehicleFilter = ref('')
const formVisible = ref(false)
const editingFile = ref<SnapshotFile | null>(null)
const canEdit = computed(() => Boolean(window.desktop?.snapshot?.save))

function openCreate() {
  editingFile.value = null
  formVisible.value = true
}

function openEdit(file: SnapshotFile) {
  editingFile.value = file
  formVisible.value = true
}

async function removeSection(file: SnapshotFile) {
  try {
    await ElMessageBox.confirm(`确定删除快照分节「${file.name}」及其 ${file.channels.length} 个通道？`, '删除快照', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const result = await store.removeSection(file.name)
  if (result.ok) {
    selectedIndex.value = 0
    ElMessage.success('快照分节已删除')
  } else {
    ElMessage.error(result.error)
  }
}

const vehicleOptions = computed(() => {
  const names = new Set<string>()
  for (const file of store.files) {
    for (const vehicle of file.vehicles) names.add(vehicle)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const visibleFiles = computed(() =>
  vehicleFilter.value
    ? store.files.filter((file) => file.vehicles.includes(vehicleFilter.value))
    : store.files,
)
const selectedFile = computed(() => visibleFiles.value[selectedIndex.value] ?? visibleFiles.value[0] ?? null)

watch(
  visibleFiles,
  () => {
    selectedIndex.value = 0
  },
)
</script>

<!-- @grid A：标题 12；左侧快照列表 3 · 右侧文件详情 9 -->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-7">
          <h1 class="text-lg font-medium text-ink">扬声器快照</h1>
        </div>
        <div class="col-span-5 justify-self-end">
          <el-button size="small" type="primary" :disabled="!canEdit" @click="openCreate">
            新增快照
          </el-button>
        </div>
      </div>

      <!-- 车型筛选：单选，过滤左侧快照列表 -->
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
      description="snapshot.ini 不可用，修正后重试即可。"
    />

    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取扬声器快照…</p>
      <el-empty v-else-if="!store.hasData" description="snapshot.ini 中还没有快照" />
      <el-empty v-else-if="!visibleFiles.length" description="未找到适用该车型的快照" />

      <div v-else class="grid grid-cols-12 gap-3">
        <!-- 左：快照分节列表 -->
        <div class="col-span-3">
          <div class="flex max-h-[60vh] flex-col overflow-y-auto border border-line">
            <button
              v-for="(file, index) in visibleFiles"
              :key="`${file.name}-${index}`"
              type="button"
              class="border-b border-line px-3 py-2 text-left text-[11px] break-all outline-none last:border-b-0 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-primary/40"
              :class="selectedIndex === index ? 'bg-surface-soft text-primary' : 'text-ink'"
              @click="selectedIndex = index"
            >
              {{ file.name }}
            </button>
          </div>
        </div>

        <!-- 右：车型与通道 -->
        <div class="col-span-9 min-w-0">
          <div v-if="selectedFile" class="border border-line">
            <div class="grid grid-cols-12 items-center border-b border-line bg-surface-soft px-3 py-2">
              <h2 class="col-span-8 text-[13px] font-medium break-all text-ink">
                {{ selectedFile.name }}
              </h2>
              <div class="col-span-4 flex justify-end gap-1">
                <el-button size="small" link type="primary" @click="openEdit(selectedFile)">
                  编辑
                </el-button>
                <el-button size="small" link type="danger" @click="removeSection(selectedFile)">
                  删除
                </el-button>
              </div>
            </div>
            <div
              v-for="channel in selectedFile.channels"
              :key="channel.channel"
              class="grid grid-cols-12 items-center border-b border-line/60 last:border-b-0"
            >
              <p class="col-span-3 px-3 py-2 text-[11px] font-medium text-ink">
                {{ channel.channel }}
              </p>
              <p class="col-span-9 min-w-0 break-all px-3 py-2 text-[11px] text-ink">
                {{ channel.speaker }}
              </p>
            </div>
            <p v-if="!selectedFile.channels.length" class="px-3 py-3 text-[11px] text-ink-muted">
              该分节没有扬声器
            </p>
          </div>
        </div>
      </div>
    </div>

    <SnapshotFormDialog v-model="formVisible" :file="editingFile" />
  </div>
</template>
