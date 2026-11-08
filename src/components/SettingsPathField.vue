<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspace } from '@/composables/useWorkspace'

/**
 * 设置页里的一行路径配置：标签 3 列 + 输入 7 列 + 选择按钮 2 列，
 * 下方用一行小字显示相对路径解析出来的绝对位置。
 */
const props = defineProps<{
  label: string
  modelValue: string
  placeholder?: string
  /** 空值时的默认相对路径，用来展示「留空会用哪」 */
  fallback?: string
  hint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  pick: []
}>()

const { project } = useWorkspace()

function isAbsolutePath(target: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(target) || target.startsWith('\\\\') || target.startsWith('/')
}

/** 相对路径按项目根解析后的绝对位置；绝对路径或无法解析时为空 */
const resolvedPath = computed(() => {
  const target = (props.modelValue.trim() || props.fallback || '').trim()
  const base = project.value?.path
  if (!target || !base || isAbsolutePath(target)) return ''
  const normalizedBase = base.replace(/\\/g, '/').replace(/\/+$/, '')
  const normalizedTarget = target
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
  return `${normalizedBase}/${normalizedTarget}`
})
</script>

<!-- @grid A：每行重新建立 12 列，标签 3 · 输入 7 · 按钮 2 -->
<template>
  <div class="grid grid-cols-12 items-center gap-2">
    <label class="col-span-3 text-[11px] text-ink-muted">{{ label }}</label>
    <div class="col-span-7">
      <el-input
        :model-value="modelValue"
        size="small"
        :placeholder="placeholder"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </div>
    <div class="col-span-2 justify-self-end">
      <el-button size="small" @click="emit('pick')">选择</el-button>
    </div>
    <p
      v-if="hint || resolvedPath"
      class="col-span-9 col-start-4 min-w-0 truncate text-[11px] text-ink-muted"
      :title="resolvedPath || hint"
    >
      <template v-if="hint">{{ hint }}</template>
      <template v-if="hint && resolvedPath"> · </template>
      <template v-if="resolvedPath">{{ resolvedPath }}</template>
    </p>
  </div>
</template>
