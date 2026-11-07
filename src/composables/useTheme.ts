import { computed, ref, watchEffect } from 'vue'

export type ThemeMode = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme-mode'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
}

// 模块级单例：所有调用方共享同一份状态
const mode = ref<ThemeMode>(readMode())

const media = window.matchMedia(DARK_QUERY)
const systemDark = ref(media.matches)
media.addEventListener('change', (event) => {
  systemDark.value = event.matches
})

const isDark = computed(() =>
  mode.value === 'system' ? systemDark.value : mode.value === 'dark',
)

// .dark 挂在 html 上：Element Plus 的深色变量与 Tailwind 的 dark: 变体都认这个类
watchEffect(() => {
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem(STORAGE_KEY, mode.value)
})

export function useTheme() {
  return { mode, isDark, resolved: computed<ResolvedTheme>(() => (isDark.value ? 'dark' : 'light')) }
}
