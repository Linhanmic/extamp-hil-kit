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

    <section class="ep-demo">
      <el-button type="primary" @click="showMessage">Element Plus 按钮</el-button>
      <el-tag type="success" effect="dark">按需引入</el-tag>
    </section>
  </main>
</template>

<style scoped>
.ep-demo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2rem;
}
</style>
