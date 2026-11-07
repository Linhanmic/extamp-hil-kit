<script setup lang="ts">
import { computed, watch } from 'vue'
import RequirementTable from './RequirementTable.vue'
import { useRequirementsImport } from '@/composables/useRequirementsImport'
import { useSettingsStore } from '@/stores/settings'
import type { RequirementsColumnMapping } from '@/models'

/**
 * 导入需求分析表（参考 tauri-app 的导入弹窗）：选文件 → 工作表 → 列映射 → 预览 → 导入。
 * 解析、Excel 读取与写文件都在主进程完成，这里只配置与核对。
 * 打开时套用设置页里的导入默认参数（工作表、表头行与列位置）。
 */
const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ imported: [] }>()

const settingsStore = useSettingsStore()

const {
  file,
  fileName,
  sheetName,
  mapping,
  probe,
  result,
  saved,
  error,
  busy,
  dirty,
  applyDefaults,
  chooseFile,
  selectSheet,
  inspect,
  updateMapping,
  resetTransient,
  preview,
  save,
} = useRequirementsImport()

watch(visible, (open) => {
  if (open) applyDefaults(settingsStore.settings.requirementsImport)
})

const sheets = computed(() => file.value?.sheets ?? [])
const vehicleOptions = computed(() => probe.value?.columns ?? [])
const stats = computed(() => result.value?.stats ?? null)
const warnings = computed(() => result.value?.warnings ?? [])
const shownWarnings = computed(() => warnings.value.slice(0, 5))

function setColumn(field: keyof RequirementsColumnMapping, value: string | number) {
  updateMapping({ [field]: value })
}

async function importAndSave() {
  await save()
  if (saved.value) emit('imported')
}

// ISO 存 UTC，界面按本地时间展示
function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<!--
  @grid A：弹窗内容每块是 Row 下整宽 Column（col-span-12）；表单行两两分配 12 列，
  按钮组按 B 方案整组占一列。
-->
<template>
  <el-dialog
    v-model="visible"
    title="导入 Excel 需求"
    width="760px"
    destroy-on-close
    @closed="resetTransient"
  >
    <div class="flex flex-col gap-3">
      <!-- 文件 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <div class="grid grid-cols-12 items-center gap-2">
          <div class="col-span-8 min-w-0">
            <p v-if="file" class="truncate text-xs font-medium text-ink" :title="file.filePath">
              {{ fileName }}
            </p>
            <p v-else class="text-xs text-ink-muted">还没有选择文件</p>
            <p v-if="file" class="truncate text-[11px] text-ink-muted" :title="file.filePath">
              {{ file.filePath }}
            </p>
          </div>
          <div class="col-span-4 justify-self-end">
            <el-button size="small" type="primary" :loading="busy" @click="chooseFile">
              选择文件
            </el-button>
          </div>
        </div>

        <div v-if="file" class="mt-2 grid grid-cols-12 items-center gap-2">
          <label class="col-span-2 text-[11px] text-ink-muted">工作表</label>
          <div class="col-span-4">
            <el-select
              :model-value="sheetName"
              size="small"
              class="w-full"
              @update:model-value="selectSheet"
            >
              <el-option v-for="name in sheets" :key="name" :label="name" :value="name" />
            </el-select>
          </div>
          <label class="col-span-2 text-[11px] text-ink-muted">表头行</label>
          <div class="col-span-4">
            <el-input-number
              :model-value="mapping.headerRow"
              size="small"
              :min="1"
              :max="200"
              controls-position="right"
              class="w-full"
              @update:model-value="setColumn('headerRow', $event ?? 1)"
            />
          </div>
        </div>
      </div>

      <!-- 列映射 -->
      <div v-if="file" class="rounded-lg border border-line bg-surface-soft p-3">
        <div class="grid grid-cols-12 items-center gap-2">
          <h3 class="col-span-8 text-xs font-medium text-ink">列映射</h3>
          <div class="col-span-4 justify-self-end">
            <el-button size="small" plain :loading="busy" @click="inspect()"
              >自动识别列映射</el-button
            >
          </div>
        </div>

        <div class="mt-2 grid grid-cols-12 items-center gap-2">
          <label class="col-span-2 text-[11px] text-ink-muted">需求ID</label>
          <div class="col-span-4">
            <el-input
              :model-value="String(mapping.idCol)"
              size="small"
              placeholder="A"
              @update:model-value="setColumn('idCol', $event)"
            />
          </div>
          <label class="col-span-2 text-[11px] text-ink-muted">需求名称</label>
          <div class="col-span-4">
            <el-input
              :model-value="String(mapping.nameCol)"
              size="small"
              placeholder="B"
              @update:model-value="setColumn('nameCol', $event)"
            />
          </div>

          <label class="col-span-2 text-[11px] text-ink-muted">需求详情</label>
          <div class="col-span-4">
            <el-input
              :model-value="String(mapping.detailCol)"
              size="small"
              placeholder="E"
              @update:model-value="setColumn('detailCol', $event)"
            />
          </div>
          <label class="col-span-2 text-[11px] text-ink-muted">车型起始列</label>
          <div class="col-span-4">
            <el-select
              :model-value="String(mapping.vehicleStartCol)"
              size="small"
              class="w-full"
              @update:model-value="setColumn('vehicleStartCol', $event)"
            >
              <el-option
                v-for="column in vehicleOptions"
                :key="column.letter"
                :value="column.letter"
                :label="`${column.letter} · ${column.header || '无表头'}${column.isPlatform ? '（平台列，忽略）' : ''}`"
              />
            </el-select>
          </div>
        </div>

        <p v-for="note in probe?.notes ?? []" :key="note" class="mt-1.5 text-[11px] text-ink-muted">
          · {{ note }}
        </p>
        <p class="mt-1.5 text-[11px] text-ink-muted">
          · 车型列单元格：<code class="text-ink">●</code> 适用，<code class="text-ink">●变体N</code>
          或 <code class="text-ink">●差异描述</code> 适用并带变体，<code class="text-ink">—</code>
          不适用
        </p>
        <p class="mt-1 text-[11px] text-ink-muted">
          · 表头含「平台」的列整列忽略；一个表头写多款车型时用
          <code class="text-ink">/</code> <code class="text-ink">、</code>
          <code class="text-ink">;</code> 分隔
        </p>
      </div>

      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />

      <!-- 解析预览 -->
      <div v-if="result && stats" class="rounded-lg border border-line bg-surface-soft p-3">
        <div class="grid grid-cols-12 items-center gap-2">
          <h3 class="col-span-5 text-xs font-medium text-ink">解析预览</h3>
          <div class="col-span-7 flex flex-wrap items-center justify-end gap-1.5">
            <el-tag size="small" type="info" effect="plain">
              需求 {{ stats.requirementCount }}
            </el-tag>
            <el-tag size="small" type="info" effect="plain">变体 {{ stats.variantCount }}</el-tag>
            <el-tag size="small" type="info" effect="plain">车型 {{ stats.vehicleCount }}</el-tag>
            <el-tag v-if="stats.skippedRows" size="small" type="warning" effect="plain">
              跳过 {{ stats.skippedRows }} 行
            </el-tag>
          </div>
        </div>

        <div class="mt-2 min-w-0">
          <p v-if="!result.requirements.length" class="text-[11px] text-ink-muted">
            没有解析出需求，请核对表头行与列映射
          </p>
          <RequirementTable v-else :requirements="result.requirements" />
        </div>

        <el-alert
          v-if="warnings.length"
          type="warning"
          :closable="false"
          :title="`${warnings.length} 条提示`"
          class="mt-2"
        >
          <ul class="text-[11px] leading-5">
            <li v-for="warning in shownWarnings" :key="`${warning.row}-${warning.message}`">
              第 {{ warning.row }} 行：{{ warning.message }}
            </li>
          </ul>
          <p v-if="warnings.length > shownWarnings.length" class="text-[11px] text-ink-muted">
            其余 {{ warnings.length - shownWarnings.length }} 条未展示
          </p>
        </el-alert>
      </div>

      <!-- 导入结果 -->
      <el-alert
        v-if="saved"
        type="success"
        show-icon
        :closable="false"
        :title="`已导入 ${saved.requirementCount} 条需求 / ${saved.variantCount} 个变体`"
      >
        <p class="text-[11px] break-all">{{ saved.filePath }}</p>
        <p class="text-[11px]">
          首次导入 {{ formatTime(saved.createdAt) }} · 最近更新 {{ formatTime(saved.updatedAt) }}
        </p>
      </el-alert>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <span v-if="dirty" class="mr-auto text-[11px] text-ink-muted">列映射已修改，需要重新预览</span>
        <div class="flex items-center gap-2">
          <el-button type="danger" @click="visible = false">关闭</el-button>
          <el-button :loading="busy" :disabled="!file" @click="preview">预览</el-button>
          <el-button
            type="primary"
            :loading="busy"
            :disabled="!result || dirty"
            @click="importAndSave"
          >
            导入
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
