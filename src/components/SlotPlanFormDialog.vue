<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSlotMapStore } from '@/stores/slotMap'
import type { SlotMappingPlan } from '@/models'

/** 表单里的一个场景：标题 + 步骤多行文本（SLOT 通道号写在步骤里） */
interface ScenarioDraft {
  title: string
  steps: string
}

const props = defineProps<{
  /** 编辑模式传当前方案，新建传 null */
  plan: SlotMappingPlan | null
}>()

const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()
const store = useSlotMapStore()

const fileName = ref('')
const vehicles = ref<string[]>([])
const scenarios = ref<ScenarioDraft[]>([])
const error = ref('')

function blankScenario(): ScenarioDraft {
  return { title: '', steps: '' }
}

watch(visible, (open) => {
  if (!open) return
  fileName.value = props.plan?.name ?? ''
  vehicles.value = [...(props.plan?.vehicles ?? [])]
  scenarios.value = props.plan
    ? props.plan.scenarios.map((scenario) => ({
        title: scenario.title,
        steps: scenario.steps.join('\n'),
      }))
    : [blankScenario()]
  error.value = ''
})

function addScenarioRow() {
  scenarios.value = [...scenarios.value, blankScenario()]
}

function removeScenarioRow(index: number) {
  scenarios.value = scenarios.value.filter((_, itemIndex) => itemIndex !== index)
}

async function submit() {
  error.value = ''
  const name = fileName.value.trim()
  if (!name) {
    error.value = '方案文件名不能为空'
    return
  }
  if (!name.toLowerCase().endsWith('.txt')) {
    error.value = '方案文件名需以 .txt 结尾'
    return
  }

  const payload = scenarios.value
    .map((scenario) => ({
      title: scenario.title.trim(),
      steps: scenario.steps
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    }))
    .filter((scenario) => scenario.title || scenario.steps.length)

  if (!payload.length) {
    error.value = '方案至少需要一个音源场景'
    return
  }
  if (payload.some((scenario) => !scenario.title)) {
    error.value = '场景标题不能为空'
    return
  }
  if (payload.some((scenario) => !scenario.steps.length)) {
    error.value = '每个场景至少需要一个步骤'
    return
  }

  const result = await store.savePlan(name, vehicles.value, payload, {
    create: props.plan === null,
  })
  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
  emit('saved')
}
</script>

<!-- @grid A：方案信息行标签 3 · 控件 9；场景卡片内部按标题与步骤垂直排列 -->
<template>
  <el-dialog
    v-model="visible"
    :title="plan ? '编辑 SLOT 映射方案' : '新建 SLOT 映射方案'"
    width="660px"
    destroy-on-close
  >
    <div class="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-3 text-[11px] text-ink-muted">方案文件名</label>
        <div class="col-span-9">
          <el-input
            v-model="fileName"
            size="small"
            placeholder="如 SLOT映射（带杜比模式）.txt"
            :disabled="Boolean(plan)"
          />
        </div>
      </div>

      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-3 text-[11px] text-ink-muted">适用车型</label>
        <div class="col-span-9">
          <el-select
            v-model="vehicles"
            size="small"
            multiple
            filterable
            allow-create
            default-first-option
            class="w-full"
            placeholder="留空表示不限车型（作为默认方案）"
          >
            <el-option
              v-for="item in store.plans.flatMap((item) => item.vehicles)"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </div>
      </div>

      <div
        v-for="(scenario, index) in scenarios"
        :key="index"
        class="rounded-lg border border-line bg-surface-soft p-3"
      >
        <div class="grid grid-cols-12 items-center gap-2">
          <label class="col-span-3 text-[11px] text-ink-muted">场景 {{ index + 1 }}</label>
          <div class="col-span-7">
            <el-input v-model="scenario.title" size="small" placeholder="如 音源盒打开媒体音SLOT" />
          </div>
          <div class="col-span-2 flex justify-end">
            <el-button size="small" link type="danger" @click="removeScenarioRow(index)">
              删除
            </el-button>
          </div>
        </div>
        <div class="mt-2 grid grid-cols-12 items-start gap-2">
          <label class="col-span-3 pt-1 text-[11px] text-ink-muted">步骤</label>
          <div class="col-span-9">
            <el-input
              v-model="scenario.steps"
              type="textarea"
              :rows="3"
              placeholder="每行一个步骤；通道号写在步骤里，如 音源盒打开SLOT1"
            />
          </div>
        </div>
      </div>

      <el-button size="small" plain @click="addScenarioRow">添加场景</el-button>
      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="store.saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
