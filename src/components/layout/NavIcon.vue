<script setup lang="ts">
import type { NavIconName } from '@/config/navigation'

defineProps<{
  name: NavIconName
}>()
</script>

<!-- 侧栏导航图标：统一 16px 线性图标，stroke 1.2 与标题栏控件保持一致 -->
<template>
  <svg
    class="size-4 shrink-0"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    stroke-width="1.2"
    aria-hidden="true"
  >
    <!-- 新建任务：加号 -->
    <template v-if="name === 'create'">
      <path d="M8 3.2v9.6M3.2 8h9.6" stroke-linecap="round" />
    </template>

    <!-- 配置参数：带旋钮的滑杆 -->
    <template v-else-if="name === 'config'">
      <path d="M3 5.2h10M3 10.8h10" stroke-linecap="round" />
      <circle cx="6" cy="5.2" r="1.6" />
      <circle cx="10" cy="10.8" r="1.6" />
    </template>

    <!-- SLOT 映射：左右两个槽位之间的对应 -->
    <template v-else-if="name === 'slot'">
      <rect x="2.6" y="3.4" width="4" height="9.2" rx="1" />
      <rect x="9.4" y="3.4" width="4" height="9.2" rx="1" />
      <path d="M6.8 8h2.4" stroke-linecap="round" />
    </template>

    <!-- 出声位置：扬声器 -->
    <template v-else-if="name === 'output'">
      <path d="M3.4 6.3h2.4L8.6 4v8L5.8 9.7H3.4z" stroke-linejoin="round" />
      <path d="M10.8 6a3 3 0 0 1 0 4" stroke-linecap="round" />
    </template>

    <!-- 音量表：电平柱 -->
    <template v-else-if="name === 'meter'">
      <path d="M4.4 12V8.6M8 12V4.6M11.6 12V7" stroke-linecap="round" />
    </template>

    <!-- 快照：相机 -->
    <template v-else-if="name === 'snapshot'">
      <path d="M2.6 5.6h2.2l1-1.6h4.4l1 1.6h2.2v7.2H2.6z" stroke-linejoin="round" />
      <circle cx="8" cy="9.2" r="2.1" />
    </template>

    <!-- 需求：文档 -->
    <template v-else>
      <path d="M4.2 2.6h5L12 5.4v8H4.2z" stroke-linejoin="round" />
      <path d="M9.2 2.6v2.8H12" stroke-linejoin="round" />
      <path d="M6 8.2h4M6 10.6h4" stroke-linecap="round" />
    </template>
  </svg>
</template>
