<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOutputStore } from '@/stores/output'
import type { OutputScenario } from '@/models'

/**
 * 新增 / 编辑出声位置场景：标题 + 适用车型 + 步骤。
 *
 * 步骤行原样保存，`speak="…"` / `no_speak="…"` 写在步骤里，出声 / 不出声关键字由
 * 读取侧从步骤重新提取，所以这里不需要单独维护关键字。
 */
const props = defineProps<{
  /** 编辑模式传当前场景，新增传 null */
  scenario: OutputScenario | null
  /** 编辑模式下的场景下标 */
  index: number | null
}>()

const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()
const store = useOutputStore()

const title = ref('')
const vehicles = ref<string[]>([])
const steps = ref('')
const error = ref('')

watch(visible, (open) => {
  if (!open) return
  title.value = props.scenario?.title ?? ''
  vehicles.value = [...(props.scenario?.vehicles ?? [])]
  steps.value = (props.scenario?.steps ?? []).join('\n')
  error.value = ''
})

async function submit() {
  error.value = ''
  const heading = title.value.trim()
  if (!heading) {
    error.value = '场景标题不能为空'
    return
  }
  const lines = steps.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    error.value = '至少填写一个步骤'
    return
  }

  const next: OutputScenario = {
    title: heading,
    allVehicles: vehicles.value.length === 0,
    vehicles: vehicles.value.map((vehicle) => vehicle.trim()).filter(Boolean),
    steps: lines,
    speakKeywords: [],
    noSpeakKeywords: [],
  }

  const result =
    props.index === null
      ? await store.addScenario(next)
      : await store.updateScenario(props.index, next)
  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
  emit('saved')
}
</script>

<!-- @grid A：每行重建 12 列，标签 3 · 控件 9；步骤框整宽 -->
<template>
  <el-dialog
    v-model="visible"
    :title="index === null ? '新增出声位置场景' : '编辑出声位置场景'"
    width="620px"
    destroy-on-close
  >
    <div class="flex flex-col gap-3">
      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-3 text-[11px] text-ink-muted">场景标题</label>
        <div class="col-span-9">
          <el-input v-model="title" size="small" placeholder="如 检查媒体音出声位置是否正确" />
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
            placeholder="留空表示全部车型"
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

      <div class="grid grid-cols-12 items-start gap-2">
        <label class="col-span-3 pt-1 text-[11px] text-ink-muted">步骤</label>
        <div class="col-span-9">
          <el-input
            v-model="steps"
            type="textarea"
            :rows="8"
            placeholder="每行一个步骤；出声关键字直接写在步骤里，如 speak=&quot;左前高音|中置&quot;"
          />
        </div>
      </div>

      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="store.saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
