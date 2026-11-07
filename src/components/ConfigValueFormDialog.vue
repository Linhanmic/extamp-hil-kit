<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConfigsStore } from '@/stores/configs'
import type { ConfigValueInput, ConfigurationValueRow } from '@/stores/configs'
import type { VariantRef } from '@/models'

/**
 * 新增 / 编辑配置值：配置值 + 关联的需求变体 + 直接填写的车型。
 * 生效车型由 store 合并计算（关联变体解析出的车型 ∪ 手工车型），这里只负责录入。
 */
const props = defineProps<{
  configKey: string
  configValue: ConfigurationValueRow | null
}>()

const visible = defineModel<boolean>({ default: false })
const store = useConfigsStore()

const text = ref('')
const refs = ref<VariantRef[]>([])
const vehicles = ref<string[]>([])
const requirementIndex = ref<number | null>(null)
const variantIndex = ref<number | null>(null)
const error = ref('')

const chosenRequirement = computed(() => {
  const index = requirementIndex.value
  return index === null ? null : (store.requirementOptions[index] ?? null)
})
const variantChoices = computed(() => chosenRequirement.value?.variants ?? [])
const chosenVariant = computed(() => {
  const index = variantIndex.value
  return index === null ? null : (variantChoices.value[index] ?? null)
})

watch(visible, (open) => {
  if (!open) return
  text.value = props.configValue?.value ?? ''
  refs.value = (props.configValue?.relay_variants ?? []).map((ref) => ({ ...ref }))
  vehicles.value = [...(props.configValue?.vehicles ?? [])]
  requirementIndex.value = null
  variantIndex.value = null
  error.value = ''
})

// 换了需求就把变体重置到第一个：空 key（无变体差异）也是合法选项，不能靠空值判断未选
watch(requirementIndex, () => {
  variantIndex.value = variantChoices.value.length ? 0 : null
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
  const variant = chosenVariant.value
  if (!requirement || !variant) return

  const exists = refs.value.some(
    (ref) =>
      ref.requirement_name === requirement.requirement_name &&
      ref.variant_key === variant.variant_key,
  )
  if (!exists) {
    refs.value = [
      ...refs.value,
      { requirement_name: requirement.requirement_name, variant_key: variant.variant_key },
    ]
  }
  requirementIndex.value = null
  variantIndex.value = null
}

function removeRef(ref: VariantRef) {
  refs.value = refs.value.filter(
    (item) =>
      !(
        item.requirement_name === ref.requirement_name && item.variant_key === ref.variant_key
      ),
  )
}

async function save() {
  error.value = ''
  if (!text.value.trim()) {
    error.value = '配置值不能为空'
    return
  }

  const input: ConfigValueInput = {
    value: text.value,
    relay_variants: refs.value,
    vehicles: vehicles.value,
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

<template>
  <el-dialog
    v-model="visible"
    :title="configValue ? '编辑配置值' : '新增配置值'"
    width="640px"
    destroy-on-close
  >
    <div class="flex flex-col gap-3">
      <!-- @grid A：配置值一行（标签 3 列 + 控件 9 列） -->
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
        <p class="text-[11px] font-medium text-ink">关联需求变体</p>
        <p class="mt-1 text-[11px] text-ink-muted">
          配置值的适用车型从关联变体解析，变体内容与车型以当前项目的需求数据为准。
        </p>

        <div v-if="refs.length" class="mt-2 flex flex-wrap items-center gap-1">
          <el-tag
            v-for="ref in refs"
            :key="`${ref.requirement_name}-${ref.variant_key}`"
            size="small"
            type="info"
            effect="plain"
            closable
            @close="removeRef(ref)"
          >
            {{ ref.requirement_name }} · {{ refLabel(ref) }}
          </el-tag>
        </div>
        <p v-else class="mt-2 text-[11px] text-ink-muted">还没有关联变体，可以只靠手工车型确定</p>

        <template v-if="store.requirementOptions.length">
          <!-- @grid A：需求 5 列 + 变体 5 列 + 添加按钮 2 列 -->
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
                v-model="variantIndex"
                size="small"
                class="w-full"
                placeholder="选择变体"
                :disabled="!variantChoices.length"
              >
                <el-option
                  v-for="(variant, index) in variantChoices"
                  :key="variant.variant_key || 'default'"
                  :value="index"
                  :label="`${variant.label} · ${variant.vehicles.length} 车型`"
                />
              </el-select>
            </div>
            <div class="col-span-2 justify-self-end">
              <el-button size="small" :disabled="!chosenVariant" @click="addRef">添加</el-button>
            </div>
          </div>
          <p v-if="store.requirementOptions.some((option) => option.duplicate)" class="mt-1 text-[11px] text-ink-muted">
            需求表里有同名需求：按名称引用会被标成歧义，建议先确认需求名称是否重复。
          </p>
        </template>
        <p v-else class="mt-2 text-[11px] text-ink-muted">
          还没有导入需求，暂时只能手工填写车型；导入需求后可以回来关联变体。
        </p>
      </div>

      <!-- 手工车型 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <p class="text-[11px] font-medium text-ink">手工车型</p>
        <p class="mt-1 text-[11px] text-ink-muted">
          这里填写的车型直接计入适用车型，适合没有对应需求的特殊配置值。
        </p>
        <div class="mt-2 grid grid-cols-12 items-center gap-2">
          <div class="col-span-12">
            <el-select
              v-model="vehicles"
              size="small"
              class="w-full"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="选择或直接输入车型名后回车"
            >
              <el-option
                v-for="vehicle in store.vehicleOptions"
                :key="vehicle"
                :label="vehicle"
                :value="vehicle"
              />
            </el-select>
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
