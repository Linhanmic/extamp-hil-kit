# extamp-hil-kit

桌面端 HIL 工具台前端。技术栈：Vue 3 + TypeScript + Vite 8、Element Plus（按需自动导入）、Tailwind CSS 4、Electron 外壳。

## 目录结构

```
build/                  应用图标与图标生成脚本（icon.png / icon.ico / icon.svg）
electron/               Electron 主进程侧（不参与渲染进程打包）
  main.ts               窗口创建、无边框配置、窗口控制 IPC、生命周期、单实例锁
  preload.ts            contextBridge 暴露窗口控制、工作区选择、需求导入等受限 API
  workspace.ts          Gauge 项目目录选择、校验与持久化（userData/workspace.json）
  requirements.ts       需求导入 IPC：选表、表头探测、解析预览、写入项目目录
  requirements-sheet.ts 用 SheetJS 把工作表读成二维单元格矩阵（不依赖 Electron，可单测）
  requirements-parse.ts 需求行 → Requirement / Variant 的纯解析逻辑（含表头与列探测）
  requirements-store.ts 解析结果落盘到 <项目>/.hil-kit/requirements.json
src/                    渲染进程（Vue 应用）
  App.vue               壳层：标题栏 + 启动页闸门 + 可拖拽三栏内容区
  components/
    layout/             壳层组件：AppTitleBar、WindowControls、AppSidebar、AppPanel、
                        AppSecondSidebar、RegionToggle、SplitResizer、DesignGrid、NavIcon
    ThemeSwitcher.vue   主题切换（跟随系统 / 浅色 / 深色）
  composables/          useTheme（主题）、useLayoutSize（区域尺寸）、useDesignGrid（设计网格）、
                        useWorkspace（Gauge 项目选择与持久化）、useRequirementsImport（需求导入流程）
  config/navigation.ts  侧栏导航项与顺序（路由与侧栏共用同一份定义）
  models/               数据模型：纯类型模块，common.ts 放共享基础类型，领域模型按需补充
  views/                LaunchView（启动页）、RequirementView（需求导入）、
                        FeatureView（其余导航项占位页）、Home/About
  assets/               main.css（Tailwind 入口 + @theme 设计变量）、base.css（设计变量）
  router/               由 NAV_ITEMS 生成导航路由；file:// 协议下自动切到 hash history
fixtures/gauge-sample/  最小的 Gauge 测试项目，用于验证启动页的项目选择流程
docs/grid-system.md     12 列栅格设计规范（页面级 + 组件级 A/B/C 方案）
docs/data-model.md      数据模型模块的组织方式与约定
testdatas/              需求分析表样例（需求导入的回归测试跑真实表格）
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

## 启动流程（Gauge 项目闸门）

应用启动时读取 `userData/workspace.json`：

- **未绑定项目** → 停在启动页（`views/LaunchView.vue`），只显示标题栏与居中卡片，三栏主界面不渲染；必须选择项目才能进入。
- **选择项目** → 打开系统目录选择器，校验目录是否包含 `manifest.json` 或 `.gauge`（Gauge 项目标记）。校验失败会就地提示错误、继续停在启动页。
- **绑定成功** → 写入 `workspace.json`（含最近 5 个项目），标题栏显示「项目名 / 页面名」，侧栏底部显示当前项目与「切换」入口。
- **路径失效** → 每次读取都会过滤掉已不存在的目录；当前项目失效时自动回到启动页。

启动页样式参考 ZCode 欢迎页：柔和渐变背景 + 居中卡片，自上而下为应用图标、欢迎标题、说明、整宽主按钮与「最近打开」列表。选择目录时会先把路径归一化（`path.resolve`），避免同一项目因分隔符不同在最近列表里重复。

仓库内置了测试用项目 `fixtures/gauge-sample`（含 `manifest.json`、`specs/smoke.spec`、`env/default/default.properties`），启动页直接选它即可通过校验。

## 需求导入（侧栏「需求」）

把需求分析表（Excel）解析成 `Requirement` / `Variant` 并落盘到当前项目，是一条四步流程：

1. **选择文件** —— 主进程弹文件选择器，只读工作表名后返回，渲染层优先选中名字带「需求」的工作表。
2. **表头探测** —— 前 30 行里找同时含「需求ID」「需求名称」的表头行；需求ID / 名称 / 详情列按同义词表匹配，车型起始列取详情列之后第一个表头含「平台」或数据区出现 `●` / `—` 的列（`功能安全` 这类只写 `QM` 的列因此不会被误判）。
3. **解析预览** —— 需求行 × 车型列的两维解析，结果在页面里展开核对：需求数、变体数、车型数、跳过行与逐行告警。
4. **导入保存** —— 写入 `<项目>/.hil-kit/requirements.json`（含解析时的列配置与车型清单，便于回溯）。

单元格约定（车型列）：`●` 适用且无变体差异、`●变体1` / `●多行差异描述` 适用并带变体描述（`●` 之后全部文本就是变体描述，`变体N` 只是代号）、`—` 不适用、空表示未填写。变体按 `key` 合并：`key` 由描述做 NFKC 归一后去掉控制字符、空白与标点得到，因此「除控制字符外其实一样」的多个写法会合并成一个变体，原始写法都留在 `content` 里、车型并入 `vehicles`。需求ID重复的行视为同一条需求的补充行（车型与变体累加）。

解析逻辑（`electron/requirements-parse.ts`）是纯函数，回归测试直接跑 `testdatas/需求分析表.xlsx` 这张真实表格：`npm run test:unit`。

Excel 读取用 SheetJS，但走「Node 读字节 + `XLSX.read(buffer)`」而不是 `XLSX.readFile`——SheetJS 的 ESM 构建里 `readFile` 依赖的文件系统钩子不会自动接上，主进程打包后调用会直接失败。

## Electron 约定

- 窗口为 **无边框**（`frame: false`），标题栏与最小化 / 最大化 / 关闭按钮全部由渲染层自绘：`AppTitleBar.vue` 整条为拖动区（`-webkit-app-region: drag`），控件标记 `no-drag`；`WindowControls.vue` 经 `window.desktop.window` 走 IPC 调用主进程，最大化状态通过 `window:maximized-change` 事件回传，用于切换最大化 / 还原图标。
- 主进程跟随 `package.json` 的 `type: module` 输出 ESM（`dist-electron/main.js`）；预加载脚本在 `sandbox: true` 下必须是 CommonJS，因此单独构建为 `dist-electron/preload.cjs`。
- 渲染进程通过 `contextIsolation: true` + `nodeIntegration: false` 隔离，Node 能力只经 `contextBridge` 暴露。
- 生产环境用 `file://` 加载 `dist/index.html`，`vite.config.ts` 里 `base: './'` 保证资源相对路径；路由在 `file:` 协议下自动切换为 hash history。
- 窗口默认 1176 × 768（DIP），最小 1120 × 720。窗口与布局一律使用逻辑像素、**不设置 `zoomFactor`**：系统缩放到 125% 时界面按 1.25 倍物理像素呈现，字号跟随用户的缩放偏好，窗口在多显示器之间移动时由 Chromium 自动重排。

## 界面规范

- 布局与栅格：见 [docs/grid-system.md](docs/grid-system.md)。区域内部的所有水平布局必须走 `grid-cols-12` + `col-span-*`；外壳三栏按设计网格份数分配（左 3 · 中 5 · 右 4，用 `fr` 表达），属于文档中写明的唯一例外。纵向对齐 48 行：标题栏 3/48（`6.25dvh`）、面板 15/48。
- 可拖拽：左栏宽度、右栏宽度、面板高度均由 `SplitResizer` + `useLayoutSize` 控制，拖动上下限写在 `useLayoutSize.ts`；分隔条同时充当 1px 分隔线。
- 桌面端专属：不做移动端适配，不写断点前缀。
- 主题：`html.dark` 单一开关，同时驱动 Tailwind `dark:` 变体、Element Plus 深色变量与页面设计令牌。
- 设计网格：`DesignGrid.vue` 提供覆盖全窗口的 12 列 × 48 行等距网格线，`fixed inset-0`、`z-index 9999`、`pointer-events: none`；标题栏按钮或 `Ctrl + Shift + G` 开关，默认关闭。
- 品牌：界面内不显示 Logo。左栏顶部是品牌名 `External Amplifier HIL Kit`，高 3/48、占侧栏 3 份中的左侧 2 份（即 2/12 窗口宽）、块内文字居中，`font-mono` 粗体黑色（暗色主题转白），两行显示。HIL 标识只作为应用图标（`build/icon.ico`，黑色圆角底 + 白色字标），由 `build/generate-icon.py` 生成。

## 编辑器与类型

TypeScript 无法默认处理 `.vue` 的类型信息，因此类型检查使用 `vue-tsc`；编辑器需安装 [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) 并禁用 Vetur。
