# extamp-hil-kit

桌面端 HIL 工具台前端。技术栈：Vue 3 + TypeScript + Vite 8、Element Plus（按需自动导入）、Tailwind CSS 4、Electron 外壳。

## 目录结构

```
electron/               Electron 主进程侧（不参与渲染进程打包）
  main.ts               窗口创建、生命周期、单实例锁、外链交系统浏览器
  preload.ts            通过 contextBridge 暴露只读运行环境信息
src/                    渲染进程（Vue 应用）
  App.vue               三栏壳层：左栏 / 中列(main_content + panel) / 右栏，12 列栅格
  components/
    layout/             壳层区域组件：AppSidebar、AppPanel、AppSecondSidebar、RegionToggle
    ThemeSwitcher.vue   主题切换（跟随系统 / 浅色 / 深色）
  composables/          useTheme 等组合式函数
  views/                路由页面
  assets/               main.css（Tailwind 入口 + @theme 设计变量）、base.css（设计变量）
  router/               file:// 协议下自动切到 hash history
docs/grid-system.md     12 列栅格设计规范（页面级 + 组件级 A/B/C 方案）
dist/                   渲染进程构建产物（git 忽略）
dist-electron/          主进程 / 预加载构建产物（git 忽略）
```

## 常用脚本

```sh
npm install         # 安装依赖（含 Electron 运行时）
npm run dev         # Vite 起开发服务器，并自动拉起 Electron 桌面窗口
npm run build       # 类型检查 + 构建渲染进程与主进程（dist / dist-electron）
npm start           # 用构建产物启动桌面应用（需先 npm run build）
npm run preview     # 仅预览渲染进程（浏览器内调试）
npm run test:unit   # Vitest 单元测试
npm run lint        # oxlint + eslint
```

## Electron 约定

- 主进程跟随 `package.json` 的 `type: module` 输出 ESM（`dist-electron/main.js`）；预加载脚本在 `sandbox: true` 下必须是 CommonJS，因此单独构建为 `dist-electron/preload.cjs`。
- 渲染进程通过 `contextIsolation: true` + `nodeIntegration: false` 隔离，Node 能力只经 `contextBridge` 暴露。
- 生产环境用 `file://` 加载 `dist/index.html`，`vite.config.ts` 里 `base: './'` 保证资源相对路径；路由在 `file:` 协议下自动切换为 hash history。
- 窗口默认 1440 × 900，最小 1120 × 720——低于该宽度会压破三栏栅格。

## 界面规范

- 布局与栅格：见 [docs/grid-system.md](docs/grid-system.md)，所有水平布局必须走 `grid-cols-12` + `col-span-*`。
- 桌面端专属：不做移动端适配，不写断点前缀。
- 主题：`html.dark` 单一开关，同时驱动 Tailwind `dark:` 变体、Element Plus 深色变量与页面设计令牌。

## 编辑器与类型

TypeScript 无法默认处理 `.vue` 的类型信息，因此类型检查使用 `vue-tsc`；编辑器需安装 [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 并禁用 Vetur。
