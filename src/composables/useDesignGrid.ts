import { ref } from 'vue'

// 设计网格覆盖层的显隐状态，模块级单例（标题栏按钮与快捷键共用）
const visible = ref(false)

export function useDesignGrid() {
  const toggle = () => {
    visible.value = !visible.value
  }

  return { visible, toggle }
}
