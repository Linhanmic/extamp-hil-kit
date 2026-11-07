<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigsStore } from '@/stores/configs'
import type { ConfigValueInput, ConfigurationValueRow } from '@/stores/configs'
import type { SpecialVehicleMatch, SpecialVehicleRule, VariantRef } from '@/models'

/**
 * 新增 / 编辑配置值：配置值 + 关联的需求变体 + 特殊车型规则。
 * 生效车型由 store 合并计算（关联变体车型 ∪ 规则命中的需求车型），这里只负责录入。
 */
const props = defineProps<{
  configKey: string
  configValue: ConfigurationValueRow | null
}>()

const visible = defineModel<boolean>({ default: false })
const store = useConfigsStore()

const text = ref('')
const refs = ref<VariantRef[]>([])
const specialRules = ref<SpecialVehicleRule[]>([])
const specialMatch = ref<SpecialVehicleMatch>('starts_with')
const specialText = ref('')
const requirementIndex = ref<number | null>(null)
/** 同一需求下可多选变体 */
const variantIndices = ref<number[]>([])
const error = ref('')

const chosenRequirement = computed(() => {
  const index = requirementIndex.value
  return index === null ? null : (store.requirementOptions[index] ?? null)
})
const variantChoices = computed(() => chosenRequirement.value?.variants ?? [])

/** 已选变体按需求分组，避免一长串「需求 · 变体」标签难读 */
const groupedRefs = computed(() => {
  const groups: { name: string; refs: VariantRef[] }[] = []
  const byName = new Map<string, VariantRef[]>()
  for (const ref of refs.value) {
    const list = byName.get(ref.requirement_name)
    if (list) list.push(ref)
    else {
      byName.set(ref.requirement_name, [ref])
      groups.push({ name: ref.requirement_name, refs: byName.get(ref.requirement_name)! })
    }
  }
  return groups
})

watch(visible, (open) => {
  if (!open) return
  text.value = props.configValue?.value ?? ''
  refs.value = (props.configValue?.relay_variants ?? []).map((ref) => ({ ...ref }))
  specialRules.value = (props.configValue?.special_vehicles ?? []).map((rule) => ({ ...rule }))
  specialMatch.value = 'starts_with'
  specialText.value = ''
  requirementIndex.value = null
  variantIndices.value = []
  error.value = ''
})

watch(requirementIndex, () => {
  variantIndices.value = []
})

function refLabel(ref: VariantRef): string {
  if (ref.variant_key === '') return '无变体差异'
  const option = store.requirementOptions.find(
    (item) => item.requirement_name === ref.requirement_name,
  )
  const index = option?.variants.findIndex((variant) => variant.variant_key === ref.variant_key)
  return index !== undefined && index >= 0 ? `变体${index + 1}` : ref.variant_key
}

function addRef() {
  const requirement = chosenRequirement.value
  if (!requirement || !variantIndices.value.length) return

  const next = [...refs.value]
  for (const index of variantIndices.value) {
    const variant = variantChoices.value[index]
    if (!variant) continue
    const exists = next.some(
      (ref) =>
        ref.requirement_name === requirement.requirement_name &&
        ref.variant_key === variant.variant_key,
    )
    if (!exists) {
      next.push({
        requirement_name: requirement.requirement_name,
        variant_key: variant.variant_key,
      })
    }
  }
  refs.value = next
  variantIndices.value = []
}

function removeRef(ref: VariantRef) {
  refs.value = refs.value.filter(
    (item) =>
      !(
        item.requirement_name === ref.requirement_name && item.variant_key === ref.variant_key
      ),
  )
}

function specialLabel(rule: SpecialVehicleRule): string {
  return rule.match === 'starts_with' ? `以 ${rule.text} 开头` : `包含 ${rule.text}`
}

function addSpecialRule() {
  const value = specialText.value.trim()
  if (!value) return
  const exists = specialRules.value.some(
    (rule) => rule.match === specialMatch.value && rule.text === value,
  )
  if (!exists) {
    specialRules.value = [...specialRules.value, { match: specialMatch.value, text: value }]
  }
  specialText.value = ''
}

function removeSpecialRule(rule: SpecialVehicleRule) {
  specialRules.value = specialRules.value.filter(
    (item) => !(item.match === rule.match && item.text === rule.text),
  )
}

async function save() {
  error.value = ''
  if (!text.value.trim()) {
    error.value = '配置值不能为空'
    return
  }
  // 输入框里还没点添加的特殊车型参数，保存时一并收下
  addSpecialRule()

  const input: ConfigValueInput = {
    value: text.value,
    relay_variants: refs.value,
    special_vehicles: specialRules.value,
  }
  const result = props.configValue
    ? await store.updateConfigValue(props.configKey, props.configValue.value, input)
    : await store.addConfigValue(props.configKey, input)

  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
}
</script>

<!--
  @grid A：配置值行标签 3 + 控件 9；变体选择行需求 5 · 变体 5 · 按钮 2；
  特殊车型行类型 4 · 参数 5 · 按钮 3。已选变体按需求分组，需求名一行、变体标签一行。
-->
<template>
  <el-dialog
    v-model="visible"
    :title="configValue ? '编辑配置值' : '新增配置值'"
    width="560px"
    destroy-on-close
  >
    <div class="flex flex-col gap-3">
      <!-- @grid A：标签 3 列 + 控件 9 列 -->
      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-3 text-[11px] text-ink-muted">配置值</label>
        <div class="col-span-9">
          <el-input
            v-model="text"
            size="small"
            maxlength="120"
            placeholder="如 14扬声器、AMP-A"
            @keyup.enter="save"
          />
        </div>
      </div>

      <!-- 关联变体 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-medium text-ink">关联需求变体</p>
          <p v-if="refs.length" class="text-[11px] text-ink-muted">{{ refs.length }} 条</p>
        </div>

        <!-- 已选：按需求分组 -->
        <div v-if="refs.length" class="mt-2 flex flex-col gap-2">
          <div
            v-for="group in groupedRefs"
            :key="group.name"
            class="rounded-md border border-line/60 bg-surface px-2 py-1.5"
          >
            <p class="text-[11px] font-medium text-ink">{{ group.name }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-1">
              <el-tag
                v-for="ref in group.refs"
                :key="`${ref.requirement_name}-${ref.variant_key}`"
                size="small"
                type="info"
                effect="plain"
                closable
                @close="removeRef(ref)"
              >
                {{ refLabel(ref) }}
              </el-tag>
            </div>
          </div>
        </div>

        <template v-if="store.requirementOptions.length">
          <!-- @grid A：需求 5 · 变体 5 · 添加 2 -->
          <div class="mt-2 grid grid-cols-12 items-center gap-2">
            <div class="col-span-5">
              <el-select
                v-model="requirementIndex"
                size="small"
                class="w-full"
                placeholder="选择需求"
                filterable
              >
                <el-option
                  v-for="(option, index) in store.requirementOptions"
                  :key="option.requirement_id"
                  :value="index"
                  :label="option.duplicate ? `${option.requirement_name}（${option.requirement_id}）` : option.requirement_name"
                />
              </el-select>
            </div>
            <div class="col-span-5">
              <el-select
                v-model="variantIndices"
                size="small"
                class="w-full"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :max-collapse-tags="2"
                placeholder="选择变体（可多选）"
                :disabled="!variantChoices.length"
              >
                <el-option
                  v-for="(variant, index) in variantChoices"
                  :key="variant.variant_key || 'default'"
                  :value="index"
                  :label="variant.label"
                />
              </el-select>
            </div>
            <div class="col-span-2 flex justify-end">
              <el-button
                size="small"
                :disabled="!chosenRequirement || !variantIndices.length"
                @click="addRef"
              >
                添加
              </el-button>
            </div>
          </div>
        </template>
        <p v-else class="mt-2 text-[11px] text-ink-muted">
          未导入需求，暂不能关联变体
        </p>
      </div>

      <!-- 特殊车型配置 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-medium text-ink">特殊车型配置</p>
          <p v-if="specialRules.length" class="text-[11px] text-ink-muted">
            {{ specialRules.length }} 条
          </p>
        </div>

        <div v-if="specialRules.length" class="mt-2 flex flex-wrap items-center gap-1">
          <el-tag
            v-for="rule in specialRules"
            :key="`${rule.match}-${rule.text}`"
            size="small"
            effect="plain"
            closable
            @close="removeSpecialRule(rule)"
          >
            {{ specialLabel(rule) }}
          </el-tag>
        </div>

        <!-- @grid A：类型 4 · 参数 5 · 添加按钮 3 -->
        <div class="mt-2 grid grid-cols-12 items-center gap-2">
          <div class="col-span-4">
            <el-select v-model="specialMatch" size="small" class="w-full" placeholder="匹配方式">
              <el-option label="车型名称以xxx开头" value="starts_with" />
              <el-option label="车型名称包含xxx" value="contains" />
            </el-select>
          </div>
          <div class="col-span-5">
            <el-input
              v-model="specialText"
              size="small"
              placeholder="输入参数"
              @keyup.enter="addSpecialRule"
            />
          </div>
          <div class="col-span-3 flex justify-end">
            <el-button
              size="small"
              :disabled="!specialText.trim()"
              @click="addSpecialRule"
            >
              添加
            </el-button>
          </div>
        </div>
      </div>

      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="store.saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
