<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Requirement, Variant } from '@/models'
import { useConfigsStore } from '@/stores/configs'
import { useRequirementsStore } from '@/stores/requirements'
import {
  analyzeRequirementAssociation,
  type RequirementAssociationStatus,
} from '@/stores/requirement-association'

/**
 * 需求关联表：首层为需求名称 · 变体数量 · 关联状态 · 映射，
 * 展开后是各变体的内容、适用车型与实际关联情况。
 * 映射开关只决定是否检查关联完整性，不改写需求或配置数据。
 */
const props = defineProps<{
  requirements: Requirement[]
  /** 展开区按变体关联状态过滤；空串显示全部 */
  variantStatus?: '' | 'linked' | 'unlinked'
}>()

const emit = defineEmits<{
  /** 从某个变体创建配置：需求 + 变体一起回给页面，由页面打开配置表单 */
  (event: 'create-config', requirement: Requirement, variant: Variant): void
}>()

const configsStore = useConfigsStore()
const requirementsStore = useRequirementsStore()
const openIds = ref(new Set<string>())

const associations = computed(() => {
  const map = new Map<string, ReturnType<typeof analyzeRequirementAssociation>>()
  for (const requirement of props.requirements) {
    map.set(
      requirement.id,
      analyzeRequirementAssociation(
        requirement,
        configsStore.configurations,
        requirementsStore.isParticipating(requirement.id),
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
  void requirementsStore.setParticipating(id, value === 'participate')
}

function joinVehicles(vehicles: string[]): string {
  return vehicles.length ? vehicles.join('/') : '—'
}

function visibleVariants(requirement: Requirement) {
  if (!props.variantStatus) return requirement.variants
  const association = associations.value.get(requirement.id)!
  const keys = props.variantStatus === 'linked' ? association.linkedKeys : association.unlinkedKeys
  return requirement.variants.filter((variant) => keys.includes(variant.key))
}

/** 需求行上的「创建配置」：取该需求第一个变体；需求没有变体时按「无变体差异」处理 */
function createConfigFromRequirement(requirement: Requirement) {
  const variant: Variant = requirement.variants[0] ?? {
    requirement_id: requirement.id,
    key: '',
    content: [],
    vehicles: [],
  }
  emit('create-config', requirement, variant)
}
</script>

<template>
  <!-- @grid A：首层与展开明细统一 12 列，需求 3 · 数量 2 · 状态 2 · 映射 3 · 操作 2；
    明细 变体内容 5 · 车型 3 · 状态 2 · 操作 2。 -->
  <div class="min-w-0 border border-line">
    <div
      class="grid grid-cols-12 items-center gap-0 border-b border-line bg-surface-soft text-[11px] font-medium text-ink"
    >
      <div class="col-span-3 px-3 py-2">需求名称</div>
      <div class="col-span-2 px-2 py-2 text-center">变体数量</div>
      <div class="col-span-2 px-2 py-2 text-center">关联状态</div>
      <div class="col-span-3 px-2 py-2 text-center">映射</div>
      <div class="col-span-2 px-2 py-2 text-center">操作</div>
    </div>

    <template v-for="requirement in requirements" :key="requirement.id">
      <div class="grid grid-cols-12 items-center gap-0 border-b border-line">
        <div class="col-span-3 flex min-w-0 items-center gap-1 px-2 py-2">
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
        <div class="col-span-3 flex items-center justify-center px-2 py-2">
          <el-segmented
            :model-value="requirementsStore.isParticipating(requirement.id) ? 'participate' : 'skip'"
            size="small"
            :options="[
              { label: '参与', value: 'participate' },
              { label: '不参与', value: 'skip' },
            ]"
            @update:model-value="setParticipating(requirement.id, $event)"
          />
        </div>
        <div class="col-span-2 flex items-center justify-center gap-1 px-2 py-2">
          <el-button
            size="small"
            link
            type="primary"
            title="按该需求第一个变体创建一条配置值"
            @click="createConfigFromRequirement(requirement)"
          >
            创建配置
          </el-button>
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
          <div class="col-span-5 px-2 py-1.5 pl-8 text-[11px] font-medium text-ink-muted">
            变体内容
          </div>
          <div class="col-span-3 px-2 py-1.5 text-[11px] font-medium text-ink-muted">
            适用车型
          </div>
          <div class="col-span-2 px-2 py-1.5 text-center text-[11px] font-medium text-ink-muted">
            关联状态
          </div>
          <div class="col-span-2 px-2 py-1.5 text-center text-[11px] font-medium text-ink-muted">
            操作
          </div>
        </div>
        <div
          v-for="variant in visibleVariants(requirement)"
          :key="variant.key"
          class="grid grid-cols-12 items-center gap-0 border-b border-line/30"
        >
          <p
            class="col-span-5 min-w-0 truncate px-2 py-1.5 pl-8 text-[11px] text-ink"
            :title="variant.content[0] ?? '无变体差异'"
          >
            {{ variant.content[0] ?? '无变体差异' }}
          </p>
          <p
            class="col-span-3 min-w-0 truncate px-2 py-1.5 text-[11px] text-ink"
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
          <div class="col-span-2 flex items-center justify-center px-2 py-1.5">
            <el-button
              size="small"
              link
              type="primary"
              @click="emit('create-config', requirement, variant)"
            >
              创建配置
            </el-button>
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
