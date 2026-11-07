<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConfigsStore } from '@/stores/configs'

/** 新增 / 重命名配置项：配置项名称是唯一键，重命名会同步配置值里的归属 */
const props = defineProps<{ configuration: string | null }>()

const visible = defineModel<boolean>({ default: false })
const store = useConfigsStore()

const name = ref('')
const error = ref('')

watch(visible, (open) => {
  if (!open) return
  name.value = props.configuration ?? ''
  error.value = ''
})

async function save() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = '配置项名称不能为空'
    return
  }

  const result = props.configuration
    ? await store.renameConfiguration(props.configuration, name.value)
    : await store.addConfiguration(name.value)

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
    :title="configuration ? '编辑配置项' : '新增配置项'"
    width="440px"
    destroy-on-close
  >
    <div class="flex flex-col gap-3">
      <!-- @grid A：标签 3 列 + 控件 9 列 -->
      <div class="grid grid-cols-12 items-center gap-2">
        <label class="col-span-3 text-[11px] text-ink-muted">配置项名称</label>
        <div class="col-span-9">
          <el-input
            v-model="name"
            size="small"
            maxlength="60"
            placeholder="如 扬声器配置、功放型号"
            @keyup.enter="save"
          />
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
