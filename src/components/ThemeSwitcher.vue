<script setup lang="ts">
import { computed } from 'vue'
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { mode } = useTheme()

const labels: Record<ThemeMode, { label: string; short: string }> = {
  system: { label: '跟随系统', short: '系统' },
  light: { label: '浅色', short: '浅色' },
  dark: { label: '深色', short: '深色' },
}

const options = (Object.keys(labels) as ThemeMode[]).map((value) => ({ value, ...labels[value] }))

const current = computed(() => labels[mode.value])

function select(value: ThemeMode) {
  mode.value = value
}
</script>

<!--
  主题切换：单个原子控件，放在「项目设置」弹窗的「外观」分组里。
  悬浮态与标题栏图标按钮一致（hover:bg-surface），弹窗卡片底色是 surface-soft，悬浮时看得出来。
-->
<template>
  <el-dropdown trigger="click" @command="select">
    <button
      type="button"
      class="flex h-8 items-center justify-center gap-1.5 rounded px-2.5 text-xs text-ink-muted transition-colors outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/40"
      :title="`主题：${current.label}`"
      :aria-label="`主题：${current.label}`"
    >
      <svg
        class="size-4"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.2"
      >
        <template v-if="mode === 'light'">
          <circle cx="8" cy="8" r="3.4" />
          <path
            d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1"
          />
        </template>
        <template v-else-if="mode === 'dark'">
          <path d="M12.6 9.4A5.4 5.4 0 0 1 6.6 3.4a5.6 5.6 0 1 0 6 6z" />
        </template>
        <template v-else>
          <circle cx="8" cy="8" r="5" />
          <path d="M8 3a5 5 0 0 1 0 10z" fill="currentColor" stroke="none" />
        </template>
      </svg>
      <span class="whitespace-nowrap">{{ current.short }}</span>
      <svg class="size-3 opacity-60" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <path d="m4 6.5 4 4 4-4" />
      </svg>
    </button>

    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="item in options" :key="item.value" :command="item.value">
          <span :class="item.value === mode ? 'text-primary-ink' : ''">
            {{ item.value === mode ? '· ' : '' }}{{ item.label }}
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
