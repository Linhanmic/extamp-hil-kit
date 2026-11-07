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
  configs.ts            配置参数 IPC：读回与整份写回 .hil-kit/config.json
  config-store.ts       配置参数落盘读写：结构校验、配置值补齐 / 去掉 config_key
  settings.ts           项目设置 IPC：读写设置与选择文件 / 目录
  settings-store.ts     项目设置落盘读写、路径解析（相对路径按项目根算）
  business.ts           业务资料只读 IPC：output / meter / slot-map / snapshot
  business-store.ts     四类业务数据（UTF-8 文本与快照目录）的读取与解析
  specs.ts              spec 清单 / 读取 / 标签写回（限制在项目 specs 目录内）
  concepts.ts           .cpt 清单 / 读取 / 写回 / 删除（限制在 concepts 目录内）
src/                    渲染进程（Vue 应用）
  App.vue               壳层：标题栏 + 启动页闸门 + 可拖拽三栏内容区
  components/
    layout/             壳层组件：AppTitleBar、WindowControls、AppSidebar、AppPanel、
                        AppSecondSidebar、RegionToggle、SplitResizer、DesignGrid、NavIcon
    ThemeSwitcher.vue   主题切换（跟随系统 / 浅色 / 深色）
    RequirementImportDialog.vue / RequirementTable.vue   需求导入弹窗与需求表
    ConfigurationFormDialog / ConfigurationTable / ConfigValueFormDialog  配置项与配置值维护
    ConceptFormDialog.vue / SettingsDialog.vue / SettingsPathField.vue    封装表单、项目设置与路径字段
  composables/          useTheme、useLayoutSize、useDesignGrid、useWorkspace、useRequirementsImport、useAsyncData
  config/navigation.ts  侧栏导航项与顺序（路由与侧栏共用同一份定义）
  config/settings-defaults.ts  项目设置的默认值（主进程与渲染层共用）
  spec/                 纯解析与条件求值：condition.ts（适用条件集合运算）、
                        spec-file.ts（Gauge 规格解析与标签改写）、concept-file.ts（.cpt 解析与生成）
  stores/               requirements、configs、settings、specs、concepts、output、meter、slotMap、snapshot
  models/               数据模型：纯类型模块，common.ts 放共享基础类型，
                        领域模型另见 concept / output / spec / slot-map / snapshot / volume
  views/                LaunchView（启动页）、RequirementView、ConfigView、SlotMapView、OutputView、
                        MeterView、SnapshotView、SpecView、ConceptView、
                        FeatureView（「新建任务」占位页）、Home/About
  assets/               main.css（Tailwind 入口 + @theme 设计变量）、base.css（设计变量）
  router/               由 NAV_ITEMS 生成导航路由；file:// 协议下自动切到 hash history
fixtures/gauge-sample/  最小的 Gauge 测试项目，用于验证启动页的项目选择流程
docs/project-specification.md  项目规格书：功能需求（FR-*）、验收用例（AT-01～AT-15）、风险与待确认项
docs/requirements-anchor.md    总体需求锚定：范围边界、非目标、成功指标与待澄清问题
docs/grid-system.md     12 列栅格设计规范（页面级 + 组件级 A/B/C 方案）
docs/data-model.md      数据模型模块的组织方式与约定
docs/requirements-json.md  requirements.json 的结构约定（JSON Schema 与导入语义）
docs/config-json.md     config.json 的结构约定（配置参数页落盘结构）
docs/config.schema.json config.json 的 JSON Schema，编辑器里可直接对数据文件校验
docs/settings-json.md    settings.json 的结构约定（项目设置与路径解析）
docs/settings.schema.json settings.json 的 JSON Schema
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

## 功能概览

侧栏 9 个入口与当前实现状态（顺序见 `src/config/navigation.ts`）：

| 入口      | 数据来源                                         | 能力                                        |
| --------- | ------------------------------------------------ | ------------------------------------------- |
| 新建任务  | 无                                               | 占位页，功能未定义                          |
| 配置参数  | `<项目>/.hil-kit/config.json`（可在设置改位置）   | 读写：配置项 / 配置值 / 变体引用 / 手工车型 |
| SLOT 映射 | 项目设置里的映射文件及其引用的 slot 文件         | 只读                                        |
| 出声位置  | 项目设置里的出声位置文件                         | 只读                                        |
| 音量表    | 项目设置里的音量表文件（UTF-8 分隔文本）         | 只读                                        |
| 快照      | 项目设置里的快照目录（`*.txt`）                  | 只读                                        |
| 规格      | `<项目>/specs/**/*.spec`                         | 条件求值预览 + 写回场景车型标签             |
| 封装管理  | `<项目>/concepts/**/*.cpt`                       | 新增 / 编辑 / 删除 + 格式校验               |
| 需求      | Excel 导入 → `<项目>/.hil-kit/requirements.json` | 导入、读回、搜索、展开详情                  |

四类只读页面只做解析与展示，不含播放、采集、实时监测或硬件执行能力。

## 需求（侧栏「需求」）

页面结构参考 `tauri-app` 的需求管理页：顶部是标题与统计标签（需求数 / 变体数）加「导入 Excel」按钮，中间是按需求ID或名称过滤的搜索框，主体是需求表格——展开行显示需求详情原文与变体列表（变体描述、适用车型、车型数）。没有数据或搜索不到时用空状态提示。

导入在弹窗里完成（`components/RequirementImportDialog.vue`，760px），是一条四步流程：

1. **选择文件** —— 主进程弹文件选择器，只读工作表名后返回，渲染层优先选中名字带「需求」的工作表。
2. **表头探测** —— 前 30 行里找同时含「需求ID」「需求名称」的表头行；需求ID / 名称 / 详情列按同义词表匹配，车型起始列取详情列之后第一个表头含「平台」或数据区出现 `●` / `—` 的列（`功能安全` 这类只写 `QM` 的列因此不会被误判）。
3. **解析预览** —— 需求行 × 车型列的两维解析，结果在弹窗里展开核对：需求数、变体数、车型数、跳过行与逐行告警。
4. **导入保存** —— 写入 `<项目>/.hil-kit/requirements.json`（默认位置，可在「项目设置」里改）：首次导入写 `createdAt`，之后每次导入都是同一份文件的更新（`createdAt` 不变、`requirements` 整体替换、`updatedAt` 刷新）。文件里只存需求与变体，不存车型全集、来源路径与列配置。结构见 [docs/requirements-json.md](docs/requirements-json.md)。

弹窗关闭时清掉预览与「已导入」提示但保留文件与列映射，下次打开可以接着用；导入成功后页面数据自动刷新。

**已保存的数据会自动读回**：应用启动、切换项目时 `stores/requirements.ts` 调 `requirements:load` 读该项目的 `requirements.json`，页面直接列出需求表，不用重新选表；文件损坏或版本不支持时提示重新导入。读取在 `electron/requirements-store.ts` 的 `readRequirements`（对结构做一次校验，不把半份数据当可信对象）。

单元格约定（车型列）：`●` 适用且无变体差异、`●变体1` / `●多行差异描述` 适用并带变体描述（`●` 之后全部文本就是变体描述，`变体N` 只是代号）、`—` 不适用、空表示未填写。变体按 `key` 合并：`key` 由描述做 NFKC 归一后去掉控制字符、空白与标点得到，因此「除控制字符外其实一样」的多个写法会合并成一个变体，原始写法都留在 `content` 里、车型并入 `vehicles`。需求ID重复的行视为同一条需求的补充行（车型与变体累加）。

车型列规则沿用 `tauri-app` 的需求表解析约定：表头含「平台」的列整列忽略（既不算车型、也不产生变体）；一个表头可写多款车型，按 `/`、`、`、`,`、`，`、`;`、`；` 拆分；车型名去引号、去空白（含 NBSP 与全角空格）、`_` 换算成 `-`；从车型起始列向右扫描时单个空表头跳过、**连续 2 个空表头**则停止，右侧杂物列不解析。

解析逻辑（`electron/requirements-parse.ts`）是纯函数，回归测试直接跑 `testdatas/需求分析表.xlsx` 这张真实表格：`npm run test:unit`。

Excel 读取用 SheetJS，但走「Node 读字节 + `XLSX.read(buffer)`」而不是 `XLSX.readFile`——SheetJS 的 ESM 构建里 `readFile` 依赖的文件系统钩子不会自动接上，主进程打包后调用会直接失败。

## 配置参数（侧栏「配置参数」）

页面结构：顶部是标题与统计标签（配置项 / 配置值 / 车型 / 引用待处理数）加「新增配置项」按钮，中间是搜索框（可按配置项、配置值、车型或需求名称过滤），主体是配置项表格——展开一行是它的配置值列表，每行显示配置值和来源标注的车型，操作是编辑 / 删除。

配置项与配置值**全部在页面里手工维护**，不解析 Excel：

- **配置项**：名称即主键，全项目唯一；重命名会同步配置值里的归属。
- **配置值**：在配置项下新增，配置值名称在同一配置项内唯一。
- **关联需求变体**：从当前项目的需求数据里选「需求 → 变体」后添加，也可删除。引用只存需求名称与变体键，变体内容与车型都以 `requirements.json` 为准。
- **手工车型**：在输入框里选或直接输入车型名，回车或点「添加」入列，用于没有对应需求的特殊配置值；想改写已输入的内容就删掉标签重加。
- **适用车型**是派生的：关联变体解析出的车型 ∪ 手工车型，去重后展示。变体车型用 `info` 标签，手工车型用默认色标签。

引用会随需求数据变化：需求还没导入、需求改名、或变体已被重新导入覆盖时，标签标为「失效」；需求表里出现同名需求时按「同名需求歧义」提示。这两种情况都保留引用、不静默删除，由用户决定移除还是重新关联。页面上「N 个引用待处理」的标签统计的就是这类配置值。

落盘位置默认 `<项目>/.hil-kit/config.json`（可在「项目设置」里改），采用「读 → 改 → 写」编辑器模型：每次增删改都把整份文件写回，首次保存写 `createdAt`，之后只刷新 `updatedAt`。写入前主进程校验结构、配置项唯一、配置值唯一，并把名称去空白、车型与变体引用去重；校验不过不写文件，错误直接回到页面。结构见 [docs/config-json.md](docs/config-json.md)，机器可校验的版本见 [docs/config.schema.json](docs/config.schema.json)。

**已保存的数据会自动读回**：应用启动、切换项目时 `stores/configs.ts` 调 `configs:load` 读该项目的 `config.json`，配置参数页直接列出配置项；文件损坏或版本不支持时提示重新维护。

界面上的读写都经主进程（`electron/config-store.ts`）：落盘结构与模型只差一个字段——配置值不重复写 `config_key`（归属由所在配置项确定），读取时按所属配置项补齐、写入时去掉。传给 IPC 前 store 会把数据转成纯对象，Vue 响应式代理不能被结构化克隆。

## 项目设置（标题栏齿轮按钮）

标题栏右侧的齿轮按钮打开「项目设置」弹窗，配置这个项目的数据都放在哪，以及需求分析表的导入默认参数。设置按项目保存到 `<项目>/.hil-kit/settings.json`，切换项目就跟着切换；结构见 [docs/settings-json.md](docs/settings-json.md) 与 [docs/settings.schema.json](docs/settings.schema.json)。

| 分组 | 设置项 | 谁在用 |
| --- | --- | --- |
| 数据文件 | 需求 JSON、配置参数 JSON | `requirements:load/save`、`configs:load/save` 的读写位置 |
| 其他业务数据 | 扬声器快照目录、音量表文件、SLOT 映射配置文件 | `output:load` / `meter:load` / `slot-map:load` / `snapshot:load` 的读取路径（只读） |
| 需求分析表导入 | 默认文件、工作表名、表头行、四个列位置 | 导入弹窗的起始路径与列映射默认值 |

路径可以写相对项目根的（如 `config/SLOT映射/mapping.ini`），也可以写绝对路径；相对路径在读写时解析，弹窗里会显示解析出来的完整位置。需求与配置参数的 json 留空表示沿用 `.hil-kit` 下的默认文件，其余三项留空表示「还没配置」。导入默认参数里的工作表名、表头行、列位置留空或填 0 表示按表自动探测——设置里显式填过的列会覆盖探测结果，代表用户意图优先。

保存后主进程整份写回设置，渲染层随即按新路径重读需求与配置参数，页面上的数据跟着换。文件缺失或损坏时读取一律带回默认值，只在弹窗和页面上提示原因，不让设置把整个工具台卡住。

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
