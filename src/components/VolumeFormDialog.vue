<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMeterStore } from '@/stores/meter'
import type { VolumeTableRow } from '@/models'

/** 新增 / 编辑音量行：车型 + 音源 + 文件原有档位的 dB；空白表示没有该音量 */
const props = defineProps<{
  row: VolumeTableRow | null
  levels: string[]
}>()

const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()
const store = useMeterStore()

const vehicle = ref('')
const source = ref('')
const values = ref<string[]>([])
const error = ref('')

const title = computed(() => (props.row ? '编辑音量' : '新增音量'))

watch(
  visible,
  (open) => {
    if (!open) return
    vehicle.value = props.row?.vehicle ?? ''
    source.value = props.row?.source ?? ''
    values.value = props.levels.map((_, index) => props.row?.values[index] ?? '')
    error.value = ''
  },
)

async function submit() {
  error.value = ''
  if (!vehicle.value.trim() || !source.value.trim()) {
    error.value = '车型与音源类型不能为空'
    return
  }
  if (values.value.some((value) => value.trim() && !Number.isFinite(Number(value.trim())))) {
    error.value = 'dB 必须是数字，留空表示没有该音量'
    return
  }

  const result = await store.saveRow(props.row, {
    vehicle: vehicle.value,
    source: source.value,
    values: [...values.value],
  })
  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
  emit('saved')
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="720px" destroy-on-close>
    <div class="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
      <!-- @grid A：车型 6 · 音源 6 -->
      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-2 text-[11px] text-ink-muted">车型</label>
        <div class="col-span-4">
          <el-input v-model="vehicle" size="small" placeholder="如 SC6H/YU2" />
        </div>
        <label class="col-span-2 text-[11px] text-ink-muted">音源类型</label>
        <div class="col-span-4">
          <el-input v-model="source" size="small" placeholder="如 媒体音" />
        </div>
      </div>

      <div class="grid grid-cols-12 items-center gap-2">
        <template v-for="(level, index) in levels" :key="level">
          <label class="col-span-1 text-right text-[11px] text-ink-muted">{{ level }}</label>
          <div class="col-span-2">
            <el-input v-model="values[index]" size="small" placeholder="-" />
          </div>
        </template>
      </div>

      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="store.saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
