<script setup lang="ts">
import type { ConfigurationRow, ConfigurationValueRow } from '@/stores/configs'

/**
 * 配置项表格：一行一个配置项，展开是它的配置值（适用车型、关联变体、操作）。
 * 车型标签区分来源——浅色是关联变体解析出来的，描边是页面直接填写的；
 * 同一车型两边都有时只显示一次。
 */
defineProps<{ rows: ConfigurationRow[] }>()

const emit = defineEmits<{
  addValue: [configKey: string]
  editConfiguration: [configKey: string]
  deleteConfiguration: [configKey: string]
  editValue: [configKey: string, value: string]
  deleteValue: [configKey: string, value: string]
}>()

function manualOnlyVehicles(value: ConfigurationValueRow): string[] {
  return value.resolved.manualVehicles.filter(
    (vehicle) => !value.resolved.variantVehicles.includes(vehicle),
  )
}
</script>

<template>
  <el-table :data="rows" size="small" max-height="420" row-key="config_key">
    <el-table-column type="expand">
      <template #default="{ row }">
        <div class="grid grid-cols-12 gap-2 px-2 py-2">
          <!-- @grid A：配置值区块头（标题 + 状态 + 操作） -->
          <div class="col-span-9 flex items-center gap-2">
            <h4 class="text-[11px] font-medium text-ink">配置值 ({{ row.valueCount }})</h4>
            <el-tag v-if="row.issueCount" size="small" type="warning" effect="plain">
              {{ row.issueCount }} 个配置值的变体引用待处理
            </el-tag>
          </div>
          <div class="col-span-3 justify-self-end">
            <el-button size="small" type="primary" link @click="emit('addValue', row.config_key)">
              新增配置值
            </el-button>
          </div>

          <div class="col-span-12 min-w-0">
            <p v-if="!row.values.length" class="text-[11px] text-ink-muted">
              这个配置项还没有配置值
            </p>
            <!-- @grid A：每个配置值一行，配置值 3 · 车型与变体 6 · 操作 3 -->
            <div v-else class="flex flex-col gap-1">
              <div
                v-for="value in row.values"
                :key="value.value"
                class="grid grid-cols-12 items-start gap-2 rounded-md bg-surface-soft px-2 py-1.5"
              >
                <p
                  class="col-span-3 min-w-0 truncate text-[11px] font-medium text-ink"
                  :title="value.value"
                >
                  {{ value.value }}
                </p>

                <div class="col-span-6 flex min-w-0 flex-col gap-1">
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="text-[11px] text-ink-muted">车型</span>
                    <el-tag
                      v-for="vehicle in value.resolved.variantVehicles"
                      :key="`variant-${vehicle}`"
                      size="small"
                      type="info"
                      effect="plain"
                    >
                      {{ vehicle }}
                    </el-tag>
                    <el-tag
                      v-for="vehicle in manualOnlyVehicles(value)"
                      :key="`manual-${vehicle}`"
                      size="small"
                      effect="plain"
                    >
                      {{ vehicle }}
                    </el-tag>
                    <span v-if="!value.resolved.vehicles.length" class="text-[11px] text-ink-muted">
                      未确定
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-1">
                    <span class="text-[11px] text-ink-muted">变体</span>
                    <el-tag
                      v-for="ref in value.resolved.refs"
                      :key="`${ref.requirement_name}-${ref.variant_key}`"
                      size="small"
                      :type="ref.status === 'ok' ? 'info' : 'danger'"
                      effect="plain"
                    >
                      {{ ref.requirement_name }} · {{ ref.label }}
                      <template v-if="ref.status === 'missing'">（失效）</template>
                      <template v-else-if="ref.status === 'ambiguous'">（同名需求歧义）</template>
                    </el-tag>
                    <span v-if="!value.resolved.refs.length" class="text-[11px] text-ink-muted">
                      未关联
                    </span>
                  </div>
                </div>

                <div class="col-span-3 flex items-center justify-end gap-1">
                  <el-button
                    type="primary"
                    link
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
                      <el-button type="danger" link>删除</el-button>
                    </template>
                  </el-popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </el-table-column>

    <el-table-column prop="config_key" label="配置项" min-width="140" show-overflow-tooltip />
    <el-table-column label="配置值" width="72" align="center">
      <template #default="{ row }">
        <el-tag size="small" round type="info" effect="plain">{{ row.valueCount }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="车型" width="64" align="center">
      <template #default="{ row }">{{ row.vehicleCount }}</template>
    </el-table-column>
    <el-table-column label="操作" width="120" align="center">
      <template #default="{ row }">
        <el-button type="primary" link @click="emit('editConfiguration', row.config_key)">
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
            <el-button type="danger" link>删除</el-button>
          </template>
        </el-popconfirm>
      </template>
    </el-table-column>
  </el-table>
</template>
