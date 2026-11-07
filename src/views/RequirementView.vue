<script setup lang="ts">
import { computed } from 'vue'
import { useRequirementsImport } from '@/composables/useRequirementsImport'
import type { RequirementsColumnMapping } from '@/models'

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
  available,
  dirty,
  chooseFile,
  selectSheet,
  inspect,
  updateMapping,
  preview,
  save,
} = useRequirementsImport()

const sheets = computed(() => file.value?.sheets ?? [])

// 车型起始列的候选项：探测到的列里挑，标签带上表头便于核对
const vehicleOptions = computed(() => probe.value?.columns ?? [])

const stats = computed(() => result.value?.stats ?? null)
const warnings = computed(() => result.value?.warnings ?? [])
const shownWarnings = computed(() => warnings.value.slice(0, 5))

// 表格每行额外带上「涉及的车型数」，避免在模板里算 Set
const previewRows = computed(() =>
  (result.value?.requirements ?? []).map((requirement) => ({
    ...requirement,
    vehicleCount: new Set(requirement.variants.flatMap((variant) => variant.vehicles)).size,
  })),
)

function setColumn(field: keyof RequirementsColumnMapping, value: string | number) {
  updateMapping({ [field]: value })
}

// 落盘时间按本地时间展示，ISO 存的是 UTC
function formatTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<!--
  需求导入：选需求分析表 → 识别表头与列 → 预览解析结果 → 写入项目目录。
  解析、Excel 读取与写文件都在主进程完成，这里只配置与核对。
  @grid A：整页纵向堆叠的每一块都是 Row 下整宽 Column（col-span-12）；
  卡片内表单行按 A 方案两两分配 12 列，按钮组按 B 方案整组占一列。
-->
<template>
  <div class="flex flex-col gap-3">
    <h1 class="text-lg font-medium text-ink">需求</h1>

    <!-- 非桌面端（浏览器里 npm run preview）时没有主进程能力 -->
    <el-alert
      v-if="!available"
      type="info"
      :closable="false"
      title="需求导入只在桌面端可用"
      description="解析 Excel 与写入项目目录需要 Electron 主进程，请通过 npm run dev 或安装包启动。"
    />

    <template v-else>
      <!-- ① 选表 -->
      <section class="rounded-lg border border-line bg-surface-soft p-3">
        <div class="grid grid-cols-12 items-center gap-2">
          <h2 class="col-span-8 text-xs font-medium text-ink">→ 选择需求分析表</h2>
          <div class="col-span-4 justify-self-end">
            <el-button size="small" type="primary" :loading="busy" @click="chooseFile">
              选择文件
            </el-button>
          </div>
        </div>

        <div v-if="file" class="mt-2 grid grid-cols-12 items-start gap-2">
          <div class="col-span-12 min-w-0">
            <p class="truncate text-xs font-medium text-ink" :title="file.filePath">
              {{ fileName }}
            </p>
            <p class="truncate text-[11px] text-ink-muted" :title="file.filePath">
              {{ file.filePath }}
            </p>
          </div>

          <!-- 工作表与表头行 -->
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
        <p v-else class="mt-2 text-[11px] text-ink-muted">还没有选择文件</p>
      </section>

      <!-- ② 列配置 -->
      <section v-if="file" class="rounded-lg border border-line bg-surface-soft p-3">
        <!-- @grid A：标题 + 重新识别按钮 -->
        <div class="grid items-center grid-cols-12 gap-2">
          <h2 class="col-span-8 text-xs font-medium text-ink">→ 列配置</h2>
          <div class="col-span-4 justify-self-end">
            <el-button size="small" plain :loading="busy" @click="inspect()">自动识别</el-button>
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

        <!-- @grid B：按钮组整组占一列，内部只用一个统一 gap -->
        <div class="mt-2 grid grid-cols-12 items-center gap-2">
          <div class="col-span-12 flex items-center gap-2">
            <el-button size="small" type="primary" plain :loading="busy" @click="preview">
              解析预览
            </el-button>
            <span v-if="dirty" class="text-[11px] text-ink-muted">配置已修改，需要重新解析</span>
          </div>
        </div>
      </section>

      <!-- 错误 -->
      <el-alert v-if="error" type="error" :closable="false" :title="error" show-icon />

      <!-- ③ 预览 -->
      <section v-if="result && stats" class="rounded-lg border border-line bg-surface-soft p-3">
        <!-- @grid A：标题 + 统计 -->
        <div class="grid items-center grid-cols-12 gap-2">
          <h2 class="col-span-5 text-xs font-medium text-ink">→ 预览</h2>
          <p class="col-span-7 justify-self-end text-[11px] text-ink-muted">
            需求 {{ stats.requirementCount }} · 变体 {{ stats.variantCount }} · 车型
            {{ stats.vehicleCount }} · 跳过 {{ stats.skippedRows }} 行
          </p>
        </div>

        <div class="mt-2 min-w-0">
          <p v-if="!previewRows.length" class="text-[11px] text-ink-muted">
            没有解析出需求，请核对表头行与列配置
          </p>
          <el-table v-else :data="previewRows" size="small" max-height="260" row-key="id">
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="px-2 py-1">
                  <div
                    v-for="(variant, index) in row.variants"
                    :key="index"
                    class="grid grid-cols-12 gap-2 border-b border-line py-1.5 last:border-b-0"
                  >
                    <p
                      class="col-span-5 truncate text-[11px] text-ink-muted"
                      :title="variant.vehicles.join('、')"
                    >
                      {{ variant.vehicles.join('、') }}
                    </p>
                    <div class="col-span-7 text-[11px] text-ink">
                      <p
                        v-if="variant.content.length"
                        class="line-clamp-2"
                        :title="variant.content[0]"
                      >
                        {{ variant.content[0] }}
                      </p>
                      <p v-else class="text-ink-muted">无变体描述（需求原文直接适用）</p>
                      <p v-if="variant.content.length > 1" class="text-ink-muted">
                        另有 {{ variant.content.length - 1 }} 种等价写法
                      </p>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="id" label="需求ID" min-width="150" show-overflow-tooltip />
            <el-table-column prop="name" label="需求名称" min-width="120" show-overflow-tooltip />
            <el-table-column label="变体" width="56">
              <template #default="{ row }">{{ row.variants.length }}</template>
            </el-table-column>
            <el-table-column prop="vehicleCount" label="车型" width="56" />
          </el-table>
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

        <!-- @grid B：导入按钮组整组占一列 -->
        <div class="mt-2 grid grid-cols-12 items-center gap-2">
          <div class="col-span-12 flex items-center gap-2">
            <el-button size="small" type="primary" :loading="busy" :disabled="dirty" @click="save">
              导入并保存
            </el-button>
            <span class="text-[11px] text-ink-muted">写入项目目录 .hil-kit/requirements.json</span>
          </div>
        </div>
      </section>

      <!-- ④ 落盘结果 -->
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
    </template>
  </div>
</template>
