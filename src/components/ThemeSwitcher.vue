<script setup lang="ts">
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { mode } = useTheme()

const options: { label: string; value: ThemeMode }[] = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]
</script>

<template>
  <el-segmented v-model="mode" :options="options" size="small" />
</template>
