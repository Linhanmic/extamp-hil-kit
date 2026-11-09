<script setup lang="ts">
import { computed } from 'vue'
import { NAV_ITEMS } from '@/config/navigation'
import { useWorkspace } from '@/composables/useWorkspace'

const { project } = useWorkspace()
const projectName = computed(() => {
  const path = project.value?.path
  if (!path) return '未选择项目'
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts.at(-1) ?? path
})

const capabilities = [
  {
    title: '需求与配置',
    desc: 'Excel 导入需求变体，配置值关联变体并求出适用车型。',
  },
  {
    title: '资产生成',
    desc: '按车型更新规格 tags，重建 SLOT 映射与出声位置目标 CPT。',
  },
  {
    title: '一键运行',
    desc: '写入 value.properties 后执行任务、场景、规格书或测试队列。',
  },
]
</script>

<template>
  <div class="flex flex-col gap-6 py-2">
    <header class="space-y-1">
      <p class="text-xs font-medium tracking-wide text-ink-muted">External Amplifier HIL Kit</p>
      <h1 class="text-2xl font-semibold text-ink">外置功放 HIL 测试工具台</h1>
      <p class="max-w-2xl text-sm leading-6 text-ink-muted">
        当前工作区：<span class="font-medium text-ink">{{ projectName }}</span>
      </p>
    </header>

    <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <article
        v-for="item in capabilities"
        :key="item.title"
        class="rounded-lg border border-ink-muted/20 bg-surface-page p-4"
      >
        <h2 class="text-sm font-semibold text-ink">{{ item.title }}</h2>
        <p class="mt-2 text-xs leading-5 text-ink-muted">{{ item.desc }}</p>
      </article>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold text-ink">快速入口</h2>
      <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.name"
          :to="item.path"
          class="rounded-md border border-ink-muted/20 px-3 py-2 text-xs text-ink transition hover:border-primary hover:text-primary-ink"
        >
          {{ item.label }}
        </RouterLink>
      </div>
    </section>
  </div>
</template>
