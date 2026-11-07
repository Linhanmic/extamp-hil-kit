<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => (route.meta.title as string | undefined) ?? '未命名')
</script>

<!-- 功能占位页：导航目标已可路由，具体内容待接入 -->
<template>
  <div class="flex h-full flex-col">
    <h1 class="text-lg font-medium text-ink">{{ title }}</h1>
    <p class="mt-1 text-xs text-ink-muted">{{ route.path }}</p>

    <div
      class="mt-4 flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed border-line text-xs text-ink-muted"
    >
      占位区域：{{ title }}待接入
    </div>
  </div>
</template>
