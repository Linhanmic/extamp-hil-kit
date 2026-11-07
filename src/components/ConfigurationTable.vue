<script setup lang="ts">
import { ref } from 'vue'
import type { ConfigurationRow, ConfigurationStatus } from '@/stores/configs'

/**
 * 配置参数表（对齐 Excel 结构稿）：
 * 外层一行一个配置项（配置项 · 状态 · 操作），展开后是配置值子表
 * （配置值 · 关联需求 · 适用车型 · 状态 · 操作），配置值再展开是变体明细。
 * 所有水平布局走 12 列栅格；嵌套层复用外层 12 列，span 按列对齐。
 */
defineProps<{ rows: ConfigurationRow[] }>()

const emit = defineEmits<{
  addValue: [configKey: string]
  editConfiguration: [configKey: string]
  deleteConfiguration: [configKey: string]
  editValue: [configKey: string, value: string]
  deleteValue: [configKey: string, value: string]
  /** 打开配置值表单以便追加关联变体 */
  addVariant: [configKey: string, value: string]
  removeVariant: [configKey: string, value: string, requirementName: string, variantKey: string]
}>()

/** 展开的配置项 config_key */
const openKeys = ref(new Set<string>())
/** 展开的配置值 `${config_key}::${value}` */
const openValueKeys = ref(new Set<string>())

function toggleConfiguration(configKey: string) {
  const next = new Set(openKeys.value)
  if (next.has(configKey)) next.delete(configKey)
  else next.add(configKey)
  openKeys.value = next
}

function toggleValue(configKey: string, value: string) {
  const key = `${configKey}::${value}`
  const next = new Set(openValueKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  openValueKeys.value = next
}

function valueRowKey(configKey: string, value: string) {
  return `${configKey}::${value}`
}

const statusLabels: Record<ConfigurationStatus, string> = {
  normal: '正常',
  floating: '浮空',
  error: '异常',
}

function statusType(status: ConfigurationStatus) {
  if (status === 'error') return 'danger'
  if (status === 'floating') return 'info'
  return 'success'
}

function joinVehicles(vehicles: string[]): string {
  return vehicles.length ? vehicles.join('/') : '—'
}

/** 关联需求列只列需求名称（去重），变体内容在展开明细里展示 */
function joinRequirementNames(refs: { requirement_name: string }[]): string {
  const names: string[] = []
  for (const ref of refs) {
    if (!names.includes(ref.requirement_name)) names.push(ref.requirement_name)
  }
  return names.length ? names.join('、') : '—'
}
</script>

<template>
  <!-- @grid A：外层表头 / 数据行统一 12 列；嵌套子表复用同一 12 列做列对齐 -->
  <div class="min-w-0 border border-line">
    <!-- 表头：配置项 9 · 状态 2 · 操作 1 -->
    <div
      class="grid grid-cols-12 items-center gap-0 border-b border-line bg-surface-soft text-[11px] font-medium text-ink"
    >
      <div class="col-span-9 px-3 py-2">配置项</div>
      <div class="col-span-2 px-2 py-2 text-center">状态</div>
      <div class="col-span-1 px-3 py-2 pr-6 text-center">操作</div>
    </div>

    <template v-for="row in rows" :key="row.config_key">
      <!-- 配置项行 -->
      <div class="grid grid-cols-12 items-center gap-0 border-b border-line">
        <div class="col-span-9 flex min-w-0 items-center gap-1 px-2 py-2">
          <button
            type="button"
            class="grid size-5 shrink-0 place-items-center rounded text-ink-muted outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
            :aria-expanded="openKeys.has(row.config_key)"
            :aria-label="`${openKeys.has(row.config_key) ? '收起' : '展开'}配置项 ${row.config_key}`"
            @click="toggleConfiguration(row.config_key)"
          >
            <svg
              class="size-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                v-if="openKeys.has(row.config_key)"
                d="M4 6.5 8 10.5 12 6.5"
              />
              <path v-else d="M6.5 4 10.5 8 6.5 12" />
            </svg>
          </button>
          <span class="min-w-0 truncate text-[13px] text-ink" :title="row.config_key">
            {{ row.config_key }}
          </span>
        </div>
        <div class="col-span-2 flex items-center justify-center px-2 py-2">
          <el-tag size="small" :type="statusType(row.status)" effect="plain">
            {{ statusLabels[row.status] }}
          </el-tag>
        </div>
        <div class="col-span-1 flex items-center justify-center gap-0 py-2 pr-6 pl-1">
          <el-button
            type="primary"
            link
            size="small"
            @click="emit('editConfiguration', row.config_key)"
          >
            编辑
          </el-button>
          <el-popconfirm
            :title="`删除配置项「${row.config_key}」及其全部配置值？`"
            confirm-button-text="删除"
            cancel-button-text="取消"
            width="220"
            @confirm="emit('deleteConfiguration', row.config_key)"
          >
            <template #reference>
              <el-button type="danger" link size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>

      <!-- 展开：配置值子表 -->
      <div v-if="openKeys.has(row.config_key)" class="border-b border-line bg-surface-soft/40">
        <!-- 子表头：配置值 3 · 关联需求 3 · 适用车型 3 · 状态 2 · 操作 1 -->
        <div class="grid grid-cols-12 items-center gap-0 border-b border-line/60">
          <div class="col-span-3 px-3 py-1.5 pl-8 text-[11px] font-medium text-ink-muted">
            配置值
          </div>
          <div class="col-span-3 px-2 py-1.5 text-[11px] font-medium text-ink-muted">
            关联需求
          </div>
          <div class="col-span-3 px-2 py-1.5 text-[11px] font-medium text-ink-muted">
            适用车型
          </div>
          <div class="col-span-2 px-2 py-1.5 text-center text-[11px] font-medium text-ink-muted">
            状态
          </div>
          <div class="col-span-1 py-1.5 pr-6 pl-2 text-center text-[11px] font-medium text-ink-muted">
            操作
          </div>
        </div>

        <p
          v-if="!row.values.length"
          class="px-3 py-3 pl-8 text-[11px] text-ink-muted"
        >
          这个配置项还没有配置值
          <el-button
            type="primary"
            link
            size="small"
            class="ml-2"
            @click="emit('addValue', row.config_key)"
          >
            新增配置值
          </el-button>
        </p>

        <template v-for="value in row.values" :key="valueRowKey(row.config_key, value.value)">
          <!-- 配置值行：整行 items-center，状态/操作与左侧同一水平线 -->
          <div class="grid grid-cols-12 items-center gap-0 border-b border-line/40">
            <div class="col-span-3 flex min-w-0 items-center gap-1 px-2 py-2 pl-8">
              <button
                type="button"
                class="grid size-4 shrink-0 place-items-center rounded text-ink-muted outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
                :aria-expanded="openValueKeys.has(valueRowKey(row.config_key, value.value))"
                :aria-label="`${openValueKeys.has(valueRowKey(row.config_key, value.value)) ? '收起' : '展开'}变体明细`"
                @click="toggleValue(row.config_key, value.value)"
              >
                <svg
                  class="size-2.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    v-if="openValueKeys.has(valueRowKey(row.config_key, value.value))"
                    d="M4 6.5 8 10.5 12 6.5"
                  />
                  <path v-else d="M6.5 4 10.5 8 6.5 12" />
                </svg>
              </button>
              <span
                class="min-w-0 truncate text-[12px] font-medium text-ink"
                :title="value.value"
              >
                {{ value.value }}
              </span>
            </div>
            <div class="col-span-3 min-w-0 truncate px-2 py-2 text-[11px] text-ink" :title="joinRequirementNames(value.resolved.refs)">
              {{ joinRequirementNames(value.resolved.refs) }}
            </div>
            <div
              class="col-span-3 min-w-0 truncate px-2 py-2 text-[11px] text-ink"
              :title="joinVehicles(value.resolved.vehicles)"
            >
              {{ joinVehicles(value.resolved.vehicles) }}
            </div>
            <div class="col-span-2 flex items-center justify-center px-2 py-2">
              <el-tag
                size="small"
                :type="statusType(value.resolved.status)"
                effect="plain"
              >
                {{ statusLabels[value.resolved.status] }}
              </el-tag>
            </div>
            <!-- 编辑 / 删除同一行 -->
            <div class="col-span-1 flex flex-nowrap items-center justify-center gap-0 py-2 pr-6 pl-0.5">
              <el-button
                type="primary"
                link
                size="small"
                @click="emit('editValue', row.config_key, value.value)"
              >
                编辑
              </el-button>
              <el-popconfirm
                :title="`删除配置值「${value.value}」？`"
                confirm-button-text="删除"
                cancel-button-text="取消"
                width="200"
                @confirm="emit('deleteValue', row.config_key, value.value)"
              >
                <template #reference>
                  <el-button type="danger" link size="small">删除</el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>

          <!-- 变体明细：需求名称 · 变体键 | 车型（样式与配置值行一致） -->
          <div
            v-if="openValueKeys.has(valueRowKey(row.config_key, value.value))"
            class="border-b border-line/30"
          >
            <p
              v-if="!value.resolved.refs.length"
              class="px-3 py-1.5 pl-14 text-[11px] text-ink-muted"
            >
              未关联需求变体；可点下方按钮关联，或在配置值里维护
            </p>
            <div
              v-for="ref in value.resolved.refs"
              :key="`${ref.requirement_name}-${ref.variant_key}`"
              class="grid grid-cols-12 items-center gap-0"
            >
              <!-- 需求名称 3 · 变体键 3 · 车型 3 · 状态 2 · 操作 1（仅删除） -->
              <div class="col-span-3 flex min-w-0 items-center gap-2 px-2 py-1.5 pl-14">
                <span class="min-w-0 truncate text-[11px] text-ink" :title="ref.requirement_name">
                  {{ ref.requirement_name }}
                </span>
              </div>
              <div class="col-span-3 min-w-0 truncate px-2 py-1.5 text-[11px] text-ink" :title="ref.label">
                {{ ref.label }}
                <span v-if="ref.status === 'missing'" class="text-ink-muted">（失效）</span>
              </div>
              <div
                class="col-span-3 min-w-0 truncate px-2 py-1.5 text-[11px] text-ink"
                :title="joinVehicles(ref.vehicles)"
              >
                {{ joinVehicles(ref.vehicles) }}
              </div>
              <div class="col-span-2 flex items-center justify-center px-2 py-1.5">
                <el-tag
                  size="small"
                  :type="ref.status === 'ok' ? 'success' : 'danger'"
                  effect="plain"
                >
                  {{ ref.status === 'ok' ? '正常' : '失效' }}
                </el-tag>
              </div>
              <div class="col-span-1 flex items-center justify-center py-1.5 pr-6 pl-1">
                <el-popconfirm
                  :title="`移除关联变体「${ref.requirement_name} · ${ref.label}」？`"
                  confirm-button-text="删除"
                  cancel-button-text="取消"
                  width="240"
                  @confirm="
                    emit(
                      'removeVariant',
                      row.config_key,
                      value.value,
                      ref.requirement_name,
                      ref.variant_key,
                    )
                  "
                >
                  <template #reference>
                    <el-button type="danger" link size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>

            <!-- 新增关联变体：样式对齐「新增配置值」 -->
            <div class="grid grid-cols-12 items-center gap-0 py-1.5">
              <div class="col-span-9 pl-14">
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click="emit('addVariant', row.config_key, value.value)"
                >
                  ＋ 新增关联变体
                </el-button>
              </div>
              <div class="col-span-2" />
              <div class="col-span-1" />
            </div>
          </div>
        </template>

        <!-- 子表底栏：新增配置值 -->
        <div class="grid grid-cols-12 items-center gap-0 py-1.5">
          <div class="col-span-9 pl-8">
            <el-button
              type="primary"
              link
              size="small"
              @click="emit('addValue', row.config_key)"
            >
              ＋ 新增配置值
            </el-button>
          </div>
          <div class="col-span-2" />
          <div class="col-span-1" />
        </div>
      </div>
    </template>
  </div>
</template>
