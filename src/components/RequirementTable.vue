<script setup lang="ts">
import { computed } from 'vue'
import type { Requirement } from '@/models'

/**
 * 需求表格（参考 tauri-app 的需求管理页）：需求ID / 名称 / 变体数量，
 * 展开行是需求详情原文 + 变体列表（变体描述与适用车型）。
 * 需求页与导入弹窗的预览共用这一份，避免两处各写一套表。
 */
const props = defineProps<{ requirements: Requirement[] }>()

// 每行带上涉及车型数与变体序号（模型里没有变体名，按列表顺序展示为「变体1、变体2…」）
const rows = computed(() =>
  props.requirements.map((requirement) => ({
    ...requirement,
    vehicleCount: new Set(requirement.variants.flatMap((variant) => variant.vehicles)).size,
    variants: requirement.variants.map((variant, index) => ({
      ...variant,
      label: `变体${index + 1}`,
    })),
  })),
)
</script>

<template>
  <el-table :data="rows" size="small" max-height="420" row-key="id">
    <el-table-column type="expand">
      <template #default="{ row }">
        <div class="grid grid-cols-12 gap-2 px-2 py-2">
          <!-- 需求详情 -->
          <div class="col-span-12">
            <h4 class="mb-1 text-[11px] font-medium text-ink">需求详情</h4>
            <p
              class="max-h-40 overflow-y-auto rounded-md border border-line bg-surface px-2.5 py-2 text-[11px] leading-relaxed whitespace-pre-wrap text-ink-muted"
            >
              {{ row.detail || '（表里没有填写需求详情）' }}
            </p>
          </div>

          <!-- 变体列表 -->
          <div class="col-span-12">
            <h4 class="mb-1 text-[11px] font-medium text-ink">
              变体列表 ({{ row.variants.length }})
            </h4>
            <div v-if="row.variants.length" class="flex flex-col gap-1">
              <div
                v-for="(variant, index) in row.variants"
                :key="index"
                class="grid grid-cols-12 gap-1 rounded-md bg-surface px-2 py-1"
              >
                <span class="col-span-2 text-[11px] font-medium text-ink">{{ variant.label }}</span>
                <p
                  class="col-span-7 line-clamp-2 text-[11px] text-ink"
                  :title="variant.content[0] ?? ''"
                >
                  {{ variant.content[0] ?? '无变体描述（需求原文直接适用）' }}
                </p>
                <div class="col-span-3 justify-self-end">
                  <el-tag size="small" round type="info" effect="plain">
                    {{ variant.vehicles.length }} 车型
                  </el-tag>
                </div>
                <p
                  class="col-span-12 truncate text-[11px] text-ink-muted"
                  :title="variant.vehicles.join('、')"
                >
                  {{ variant.vehicles.join('、') }}
                </p>
              </div>
            </div>
            <p v-else class="text-[11px] text-ink-muted">该需求没有解析到变体</p>
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="id" label="需求ID" min-width="150" show-overflow-tooltip />
    <el-table-column prop="name" label="需求名称" min-width="110" show-overflow-tooltip />
    <el-table-column label="变体" width="64" align="center">
      <template #default="{ row }">
        <el-tag size="small" round type="info" effect="plain">{{ row.variants.length }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="vehicleCount" label="车型" width="64" align="center" />
  </el-table>
</template>
