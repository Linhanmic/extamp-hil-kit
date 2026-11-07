# extamp-hil-kit

桌面端 HIL 工具台前端。技术栈：Vue 3 + TypeScript + Vite 8、Element Plus（按需自动导入）、Tailwind CSS 4、Electron 外壳。

## 目录结构

```
build/                  应用图标与图标生成脚本（icon.png / icon.ico / icon.svg）
electron/               Electron 主进程侧（不参与渲染进程打包）
  main.ts               窗口创建、无边框配置、窗口控制 IPC、生命周期、单实例锁
  preload.ts            contextBridge 暴露只读环境信息与窗口控制 API
src/                    渲染进程（Vue 应用）
  App.vue               壳层：自定义标题栏 + 可拖拽三栏内容区
  components/
    layout/             壳层组件：AppTitleBar、WindowControls、AppSidebar、AppPanel、
                        AppSecondSidebar、RegionToggle、SplitResizer
    ThemeSwitcher.vue   主题切换（跟随系统 / 浅色 / 深色）
  composables/          useTheme（主题）、useLayoutSize（可拖拽区域尺寸）
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

- 窗口为 **无边框**（`frame: false`），标题栏与最小化 / 最大化 / 关闭按钮全部由渲染层自绘：`AppTitleBar.vue` 整条为拖动区（`-webkit-app-region: drag`），控件标记 `no-drag`；`WindowControls.vue` 经 `window.desktop.window` 走 IPC 调用主进程，最大化状态通过 `window:maximized-change` 事件回传，用于切换最大化 / 还原图标。
- 主进程跟随 `package.json` 的 `type: module` 输出 ESM（`dist-electron/main.js`）；预加载脚本在 `sandbox: true` 下必须是 CommonJS，因此单独构建为 `dist-electron/preload.cjs`。
- 渲染进程通过 `contextIsolation: true` + `nodeIntegration: false` 隔离，Node 能力只经 `contextBridge` 暴露。
- 生产环境用 `file://` 加载 `dist/index.html`，`vite.config.ts` 里 `base: './'` 保证资源相对路径；路由在 `file:` 协议下自动切换为 hash history。
- 窗口默认 1440 × 900，最小 1120 × 720——低于该宽度会压破三栏栅格。

## 界面规范

- 布局与栅格：见 [docs/grid-system.md](docs/grid-system.md)。区域内部的所有水平布局必须走 `grid-cols-12` + `col-span-*`；外壳三栏是拖拽出来的像素轨道，属于文档中写明的唯一例外。
- 可拖拽：左栏宽度、右栏宽度、面板高度均由 `SplitResizer` + `useLayoutSize` 控制，拖动上下限写在 `useLayoutSize.ts`；分隔条同时充当 1px 分隔线。
- 桌面端专属：不做移动端适配，不写断点前缀。
- 主题：`html.dark` 单一开关，同时驱动 Tailwind `dark:` 变体、Element Plus 深色变量与页面设计令牌。
- 设计网格：`DesignGrid.vue` 提供覆盖全窗口的 12 列 × 48 行等距网格线，`fixed inset-0`、`z-index 9999`、`pointer-events: none`；标题栏按钮或 `Ctrl + Shift + G` 开关，默认关闭。
- 品牌：界面内不显示 Logo，品牌名以 `font-brand`（Bahnschrift → Segoe UI 回退）黑色粗体显示在左栏顶部；HIL 标识只作为应用图标（`build/icon.ico`，黑色圆角底 + 白色字标），由 `build/generate-icon.py` 生成。

## 编辑器与类型

TypeScript 无法默认处理 `.vue` 的类型信息，因此类型检查使用 `vue-tsc`；编辑器需安装 [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 并禁用 Vetur。
