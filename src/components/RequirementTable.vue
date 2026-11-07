<script setup lang="ts">
import { computed } from 'vue'
import type { Requirement } from '@/models'

/**
 * 需求数据表格：需求ID / 名称 / 变体数 / 车型数，展开行列出每个变体的适用车型与描述。
 * 预览与「已保存的需求」共用，避免两处各写一套表。
 */
const props = defineProps<{ requirements: Requirement[] }>()

// 每行带上涉及车型数，避免在模板里算 Set
const rows = computed(() =>
  props.requirements.map((requirement) => ({
    ...requirement,
    vehicleCount: new Set(requirement.variants.flatMap((variant) => variant.vehicles)).size,
  })),
)
</script>

<template>
  <el-table :data="rows" size="small" max-height="260" row-key="id">
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
              <p v-if="variant.content.length" class="line-clamp-2" :title="variant.content[0]">
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
</template>
