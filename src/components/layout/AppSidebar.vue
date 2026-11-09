<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { NAV_GROUPS } from '@/config/navigation'
import NavIcon from './NavIcon.vue'

const route = useRoute()
</script>

<template>
  <aside class="flex min-h-0 flex-col overflow-y-auto bg-surface-soft">
    <!-- 分组导航：组名 11px + 组内图标+文字项；选中态有字重与左侧指示条，不单靠色 -->
    <nav class="flex shrink-0 flex-col gap-3 p-2">
      <div v-for="group in NAV_GROUPS" :key="group.title" class="flex flex-col gap-0.5">
        <p class="px-2 pb-0.5 text-[11px] font-medium tracking-wide text-ink-muted">
          {{ group.title }}
        </p>
        <!-- @grid B：导航项是「图标 + 文字」组合，整项占满所在列，内部只用统一 gap -->
        <RouterLink
          v-for="item in group.items"
          :key="item.name"
          :to="item.path"
          class="relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40 [&.router-link-exact-active]:bg-primary/10 [&.router-link-exact-active]:text-primary-ink [&.router-link-exact-active]:font-medium"
        >
          <span
            aria-hidden="true"
            class="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
            :class="route.path === item.path ? 'bg-primary' : 'bg-transparent'"
          />
          <NavIcon :name="item.icon" />
          <span class="truncate">{{ item.label }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- 项目切换已移至标题栏（侧栏底部不放关键动作） -->
    <div class="min-h-4 flex-1" />
  </aside>
</template>
