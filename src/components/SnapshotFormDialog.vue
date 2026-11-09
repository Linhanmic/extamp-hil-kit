<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSnapshotStore } from '@/stores/snapshot'
import type { SnapshotFile } from '@/models'

/**
 * 新增 / 编辑快照分节：分节名（适用车型，多车型用 / 分隔）+ 扬声器列表。
 * 通道号按扬声器行序从 1 递增，因此只维护「一行一个扬声器」。
 */
const props = defineProps<{
  /** 编辑模式传当前分节，新增传 null */
  file: SnapshotFile | null
}>()

const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ saved: [] }>()
const store = useSnapshotStore()

const vehicles = ref('')
const speakers = ref('')
const error = ref('')

const section = computed(() =>
  vehicles.value
    .split(/[/、,，;；\n]/)
    .map((vehicle) => vehicle.trim())
    .filter(Boolean)
    .join('/'),
)

watch(visible, (open) => {
  if (!open) return
  vehicles.value = props.file ? props.file.vehicles.join('/') : ''
  speakers.value = (props.file?.channels ?? []).map((channel) => channel.speaker).join('\n')
  error.value = ''
})

async function submit() {
  error.value = ''
  if (!section.value) {
    error.value = '适用车型不能为空'
    return
  }
  const lines = speakers.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length) {
    error.value = '至少填写一个扬声器'
    return
  }

  const next: SnapshotFile = {
    name: section.value,
    vehicles: section.value.split('/').filter(Boolean),
    channels: lines.map((speaker, index) => ({ channel: `通道${index + 1}`, speaker })),
  }

  const result = props.file
    ? await store.updateSection(props.file.name, next)
    : await store.addSection(next.name, lines)
  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
  emit('saved')
}
</script>

<!-- @grid A：标签 3 · 控件 9；扬声器框整宽 -->
<template>
  <el-dialog
    v-model="visible"
    :title="file ? '编辑快照' : '新增快照'"
    width="480px"
    destroy-on-close
  >
    <div class="flex flex-col gap-3">
      <!-- @grid A：标签 3 · 控件 9 -->
      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-3 text-[11px] text-ink-muted">适用车型</label>
        <div class="col-span-9">
          <el-input
            v-model="vehicles"
            size="small"
            placeholder="如 SC6H/YU2"
            @keyup.enter="submit"
          />
        </div>
      </div>
      <div class="grid grid-cols-12 items-start gap-2">
        <label class="col-span-3 pt-1 text-[11px] text-ink-muted">扬声器</label>
        <div class="col-span-9">
          <el-input
            v-model="speakers"
            type="textarea"
            :rows="8"
            placeholder="每行一个扬声器，从上到下对应通道 1、2、3…"
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
