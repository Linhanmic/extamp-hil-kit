<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Requirement } from '@/models'
import { useConfigsStore } from '@/stores/configs'
import {
  analyzeRequirementAssociation,
  type RequirementAssociationStatus,
} from '@/stores/requirement-association'

/**
 * 需求关联表：首层为需求名称 · 变体数量 · 关联状态 · 处理，
 * 展开后是各变体的内容、适用车型与实际关联情况。
 * 处理开关只决定是否检查关联完整性，不改写需求或配置数据。
 */
const props = defineProps<{ requirements: Requirement[] }>()

const configsStore = useConfigsStore()
const openIds = ref(new Set<string>())
const excludedIds = ref(new Set<string>())

const associations = computed(() => {
  const map = new Map<string, ReturnType<typeof analyzeRequirementAssociation>>()
  for (const requirement of props.requirements) {
    map.set(
      requirement.id,
      analyzeRequirementAssociation(
        requirement,
        configsStore.configurations,
        !excludedIds.value.has(requirement.id),
      ),
    )
  }
  return map
})

const statusLabels: Record<RequirementAssociationStatus, string> = {
  normal: '正常',
  unlinked: '未关联',
  variant_added: '变体增加',
  variant_removed: '变体删除',
  variant_changed: '变体变更',
}

function statusType(status: RequirementAssociationStatus) {
  if (status === 'normal') return 'success'
  if (status === 'unlinked') return 'info'
  if (status === 'variant_removed' || status === 'variant_changed') return 'danger'
  return 'warning'
}

function toggleExpanded(id: string) {
  const next = new Set(openIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}

function setParticipating(id: string, value: string | number | boolean) {
  const next = new Set(excludedIds.value)
  if (value === 'participate') next.delete(id)
  else next.add(id)
  excludedIds.value = next
}

function joinVehicles(vehicles: string[]): string {
  return vehicles.length ? vehicles.join('/') : '—'
}
</script>

<template>
  <!-- @grid A：首层与展开明细统一 12 列，需求 6 · 数量 2 · 状态 2 · 处理 2 -->
  <div class="min-w-0 border border-line">
    <div
      class="grid grid-cols-12 items-center gap-0 border-b border-line bg-surface-soft text-[11px] font-medium text-ink"
    >
      <div class="col-span-6 px-3 py-2">需求名称</div>
      <div class="col-span-2 px-2 py-2 text-center">变体数量</div>
      <div class="col-span-2 px-2 py-2 text-center">关联状态</div>
      <div class="col-span-2 px-2 py-2 text-center">处理</div>
    </div>

    <template v-for="requirement in requirements" :key="requirement.id">
      <div class="grid grid-cols-12 items-center gap-0 border-b border-line">
        <div class="col-span-6 flex min-w-0 items-center gap-1 px-2 py-2">
          <button
            type="button"
            class="grid size-5 shrink-0 place-items-center rounded text-ink-muted outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
            :aria-expanded="openIds.has(requirement.id)"
            :aria-label="`${openIds.has(requirement.id) ? '收起' : '展开'}需求 ${requirement.name}`"
            @click="toggleExpanded(requirement.id)"
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
              <path v-if="openIds.has(requirement.id)" d="M4 6.5 8 10.5 12 6.5" />
              <path v-else d="M6.5 4 10.5 8 6.5 12" />
            </svg>
          </button>
          <span class="min-w-0 truncate text-[13px] text-ink" :title="requirement.name">
            {{ requirement.name }}
          </span>
        </div>
        <div class="col-span-2 flex items-center justify-center px-2 py-2">
          <el-tag size="small" type="info" effect="plain">
            {{ requirement.variants.length }}
          </el-tag>
        </div>
        <div class="col-span-2 flex items-center justify-center px-2 py-2">
          <el-tag
            size="small"
            :type="statusType(associations.get(requirement.id)!.status)"
            effect="plain"
          >
            {{ statusLabels[associations.get(requirement.id)!.status] }}
          </el-tag>
        </div>
        <div class="col-span-2 flex items-center justify-center px-2 py-2">
          <el-segmented
            :model-value="excludedIds.has(requirement.id) ? 'skip' : 'participate'"
            size="small"
            :options="[
              { label: '参与', value: 'participate' },
              { label: '不参与', value: 'skip' },
            ]"
            @update:model-value="setParticipating(requirement.id, $event)"
          />
        </div>
      </div>

      <!-- 展开：变体明细 -->
      <div
        v-if="openIds.has(requirement.id)"
        class="border-b border-line bg-surface-soft/40 px-2 py-2"
      >
        <div class="mb-2 px-2">
          <p class="text-[11px] font-medium text-ink">需求ID：{{ requirement.id }}</p>
          <p class="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-ink-muted">
            {{ requirement.detail || '（表里没有填写需求详情）' }}
          </p>
        </div>
        <div class="grid grid-cols-12 items-center gap-0 border-b border-line/60">
          <div class="col-span-6 px-2 py-1.5 pl-8 text-[11px] font-medium text-ink-muted">
            变体内容
          </div>
          <div class="col-span-4 px-2 py-1.5 text-[11px] font-medium text-ink-muted">
            适用车型
          </div>
          <div class="col-span-2 px-2 py-1.5 text-center text-[11px] font-medium text-ink-muted">
            关联状态
          </div>
        </div>
        <div
          v-for="variant in requirement.variants"
          :key="variant.key"
          class="grid grid-cols-12 items-center gap-0 border-b border-line/30"
        >
          <p
            class="col-span-6 min-w-0 truncate px-2 py-1.5 pl-8 text-[11px] text-ink"
            :title="variant.content[0] ?? '无变体差异'"
          >
            {{ variant.content[0] ?? '无变体差异' }}
          </p>
          <p
            class="col-span-4 min-w-0 truncate px-2 py-1.5 text-[11px] text-ink"
            :title="joinVehicles(variant.vehicles)"
          >
            {{ joinVehicles(variant.vehicles) }}
          </p>
          <div class="col-span-2 flex items-center justify-center px-2 py-1.5">
            <el-tag
              size="small"
              :type="associations.get(requirement.id)!.linkedKeys.includes(variant.key) ? 'success' : 'info'"
              effect="plain"
            >
              {{ associations.get(requirement.id)!.linkedKeys.includes(variant.key) ? '已关联' : '未关联' }}
            </el-tag>
          </div>
        </div>
        <p
          v-if="associations.get(requirement.id)!.staleKeys.length"
          class="px-2 py-1.5 pl-8 text-[11px] text-ink-muted"
        >
          另有 {{ associations.get(requirement.id)!.staleKeys.length }} 条已失效变体引用
        </p>
      </div>
    </template>
  </div>
</template>
