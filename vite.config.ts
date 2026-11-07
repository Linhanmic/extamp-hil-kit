import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import electron from 'vite-plugin-electron/simple'

// 主进程跟随 package.json 的 type: module 输出为 ESM（Electron 28+ 支持）；
// 预加载脚本在 sandbox 下必须是 CommonJS，因此单独指定 .cjs 产物
const preloadBuild = {
  outDir: 'dist-electron',
  emptyOutDir: false,
  rollupOptions: {
    output: { format: 'cjs' as const, entryFileNames: 'preload.cjs', codeSplitting: false },
  },
}

// https://vite.dev/config/
export default defineConfig({
  // 桌面端通过 file:// 加载产物，资源路径必须是相对路径
  base: './',
  plugins: [
    vue(),
    vueDevTools(),
    // Tailwind v4：配置走 CSS（见 src/assets/main.css 的 @theme），无需 tailwind.config.js
    tailwindcss(),
    // 自动导入 Element Plus 的 API 及其样式（如 ElMessage、ElMessageBox）
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts',
    }),
    // 组件按需导入：模板中直接使用 <el-button> 等无需手动注册
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
    // Electron：dev 下自动拉起桌面窗口，build 下附带编译主进程与预加载
    electron({
      main: { entry: 'electron/main.ts' },
      preload: {
        input: 'electron/preload.ts',
        vite: { build: preloadBuild },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
