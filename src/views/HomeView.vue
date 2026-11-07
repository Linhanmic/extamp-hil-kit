<script setup lang="ts">
import TheWelcome from '../components/TheWelcome.vue'

function showMessage() {
  // ElMessage 由 unplugin-auto-import 自动导入，无需手动 import
  ElMessage.success('Element Plus 已接入成功 🎉')
}
</script>

<template>
  <main>
    <TheWelcome />

    <section class="mt-8 mb-10 flex flex-wrap items-center justify-center gap-3">
      <el-button type="primary" @click="showMessage">Element Plus 按钮</el-button>
      <el-tag type="success" effect="dark">按需引入</el-tag>
      <!-- bg-primary 来自 main.css 的 @theme，取值是 Element Plus 的 --el-color-primary -->
      <span class="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white">
        Tailwind 生效
      </span>
    </section>
  </main>
</template>
