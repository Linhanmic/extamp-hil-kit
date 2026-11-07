<script setup lang="ts">
import HelloWorld from '../components/HelloWorld.vue'
import TheWelcome from '../components/TheWelcome.vue'

function showMessage() {
  // ElMessage 由 unplugin-auto-import 自动导入，无需手动 import
  ElMessage.success('Element Plus 已接入成功 🎉')
}
</script>

<template>
  <div class="starter-content">
    <HelloWorld msg="You did it!" />
    <TheWelcome />

    <section class="mt-8 mb-4 flex flex-wrap items-center justify-center gap-3">
      <el-button type="primary" @click="showMessage">Element Plus 按钮</el-button>
      <el-tag type="success" effect="dark">按需引入</el-tag>
      <!-- bg-primary 来自 main.css 的 @theme，取值是 Element Plus 的 --el-color-primary -->
      <span class="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white">
        Tailwind 生效
      </span>
    </section>
  </div>
</template>

<style scoped>
/* 示例内容沿用 starter 的绿色链接观感，避免影响壳层里的导航链接 */
.starter-content :deep(a) {
  text-decoration: none;
  color: hsla(160, 100%, 37%, 1);
  transition: 0.4s;
  padding: 3px;
}

.starter-content :deep(a:hover) {
  background-color: hsla(160, 100%, 37%, 0.2);
}
</style>
