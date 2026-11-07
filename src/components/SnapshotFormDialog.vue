<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSnapshotStore } from '@/stores/snapshot'

/** 新增快照：适用车型作为 INI 分节名，逐行扬声器按通道递增 */
const visible = defineModel<boolean>({ default: false })
const emit = defineEmits<{ added: [] }>()
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
  vehicles.value = ''
  speakers.value = ''
  error.value = ''
})

async function submit() {
  error.value = ''
  if (!section.value) {
    error.value = '适用车型不能为空'
    return
  }
  const lines = speakers.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) {
    error.value = '至少填写一个扬声器'
    return
  }

  const result = await store.addSnapshot(section.value, lines)
  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
  emit('added')
}
</script>

<template>
  <el-dialog v-model="visible" title="新增快照" width="480px" destroy-on-close>
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
      <el-button type="primary" :loading="store.saving" @click="submit">新增</el-button>
    </template>
  </el-dialog>
</template>
