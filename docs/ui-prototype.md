# 界面原型设计稿

本文档对应 Ardot 画布文件：**外置功放 HIL 工具台 · 桌面端界面原型**
<https://ardot.tencent.com/file/744948417387252>

设计稿不是另起的一套视觉，而是**照着代码实况复刻**：所有色值取自 `src/assets/main.css`
的 `@theme` 定义与 Element Plus 语义色，所有几何取自 `src/components/layout/*` 与
`src/composables/useLayoutSize.ts` 的实际数值。因此它可以直接当作实现的对照基准，
也能反向校验代码是否偏离了既定规范。

---

## 1. 屏幕清单

| # | 屏幕 | 画布坐标 | 对应实现 |
| --- | --- | --- | --- |
| 01 | 启动页（项目闸门） | (0, 0) | `views/LaunchView.vue` |
| 02 | 需求页 | (1276, 0) | `views/RequirementView.vue` + `components/RequirementTable.vue` |
| 03 | 配置参数页 | (2552, 0) | `views/ConfigView.vue` + `components/ConfigurationTable.vue` |
| 04 | 规格页 | (3828, 0) | `views/SpecView.vue` |
| 05 | 需求导入弹窗（第 2 步「表头探测」） | (0, 868) | `components/RequirementImportDialog.vue` |
| 06 | 项目设置弹窗 | (1276, 868) | `components/SettingsDialog.vue` |
| 07 | 出声位置页 | (2552, 868) | `views/OutputView.vue` |
| 08 | 封装管理页 | (3828, 868) | `views/ConceptView.vue` |
| 09 | 设计令牌板 | (0, 1736) | `src/assets/main.css`、`docs/grid-system.md` |
| 10 | SLOT 映射（总览矩阵） | (1276, 1736) | 拟替代 `views/SlotMapView.vue` 当前空状态 |
| 11 | SLOT 映射（方案详情） | (2552, 1736) | 同上，结构化视图 + 源文本预览 |
| 12 | 测试任务（新建/编辑场景） | (0, 4468) | `views/NewTaskView.vue` + `stores/tasks.ts` |
| 13 | 测试队列（混合状态） | (1276, 4468) | `views/QueueView.vue` + `stores/queue.ts` |
| 14 | 测试队列（执行中） | (2552, 4468) | 同上，running 态 + 底部终端输出 |
| 15 | 项目浏览器（索引 + 检索） | (0, 5336) | `views/SpecView.vue` 的拟扩展：全局搜索 + 组合筛选 + 目录索引 / 命中结果 |
| 16 | Spec 详情（按需展开） | (1276, 5336) | 同上，场景虚拟列表 + 选中场景 steps / 折叠数据表 |
| 17 | 概念索引与影响面 | (2552, 5336) | `views/ConceptView.vue` 的拟扩展：反向引用 + 嵌套展开 + 告警 |

音量表与快照仍与「出声位置」共用「标题行 → 搜索工具栏 → 卡片列表」骨架，参考 07 号屏。
SLOT 映射因为要一屏看清「所有映射情况 × 对应车型」，单独出 10、11 两屏，不再复用卡片列表骨架。

第 4 行（y = 4468）为后补的三屏：代码里「新建任务」与「测试队列」已落地，
原先「占位页、不出图」的判断失效，故按当前实现补齐 12～14 号屏。

第 5 行（y = 5336）为 Gauge **测试项目**展示的三屏：不是展示 Gauge 框架源码架构，
而是展示 `specs/*.spec`、`concepts/*.cpt` 与 scenario 的层级和引用关系。
首版按小项目内容快照绘制，经用户指出「不适合大型 gauge 测试项目」后**已整批重画为
大型项目形态**（索引优先 + 主详情 + 全局搜索/组合筛选，底部终端收起）；
规模数字为示意，页头有「规模模拟」标记。依据见第 8 章。

---

## 2. 组件库

画布底部（y = 2664 起）为可复用组件，全部屏幕均由其组装：

| 组件 | 画布节点 | 说明 |
| --- | --- | --- |
| 组件 · 标题栏 | `3:1` | 13 条轨道：标题 661 · 项目设置 83 · 设计网格 83 · 区域开关组 165 · 窗口控制 132（定宽） |
| 组件 · 左侧栏 | `3:60` | 294px 宽，品牌行 + 9 导航项 + 任务列表 + 项目栏（**旧版**，见下方漂移说明） |
| 组件 · 底部面板 | `3:121` | 240px 高（48 行中的 15 行），标签栏 + 内容区；实例内文字节点 `;3:129` 可覆盖终端输出 |
| 组件 · 屏幕骨架 | `3:130` | 标题栏 + 三栏 + 面板的完整组装 |

侧栏因「当前页」高亮不同，另存了 10 份变体：
`3:963` / `3:1024` / `3:1085` / `3:1146` / `3:1207` / `3:1277`（需求 / 配置参数 / 规格 /
出声位置 / 封装管理 / SLOT 映射，均为 **9 项旧版**），
以及 `7:1` / `7:62` / `7:399` / `7:492`（测试任务 / 测试队列 / 规格书 / 封装库，
按当前代码 **10 项新版**）。15、16 号屏用 `7:399`，17 号屏用 `7:492`。

**侧栏漂移（待统一刷新）**：`src/config/navigation.ts` 现为 10 个入口，新增「测试队列」插在第 2 位，
且 4 个标签已更名（快照 → 扬声器快照、规格 → 规格书、封装管理 → 封装库、需求 → 软件需求）。
12～17 号屏用的是新版侧栏，01～08、10、11 号屏仍指向旧版变体。旧屏需要按「先改组件、再改屏幕」
的约定统一刷新一次，本次未动，避免把两批屏幕的改动混在一起。

---

## 3. 设计令牌

全部取自代码，无一处臆造：

| 令牌 | 值 | 来源 |
| --- | --- | --- |
| `surface` | `#FFFFFF` | `--el-bg-color` |
| `surface-soft` | `#F5F7FA` | `--el-fill-color-light` |
| `surface-page` | `#F2F3F5` | `--el-bg-color-page` |
| `line` | `#E4E7ED` | `--el-border-color-light` |
| `ink` | `#303133` | `--el-text-color-primary` |
| `ink-muted` | `#909399` | `--el-text-color-secondary` |
| `primary` | `#409EFF` | `--el-color-primary` |
| success / warning / danger | `#67C23A` / `#E6A23C` / `#F56C6C` | Element Plus 语义色 |

**状态色语义**（原型中一致表达）：

- 灰底灰字 —— 中性、无需处理
- 绿底绿字 —— 正常
- 黄底黄字 —— 待处理 / 告警 / 失效引用
- 红底红字 —— 失效 / 危险
- 蓝底蓝字 —— 新值、强调、将更新

**字号阶梯**：18 页面标题 / 14 区块标题 / 13 正文与表头 / 12 次要说明 / 11 辅助提示；
品牌名 13px 等宽粗体。

**字体**：正文 `Source Han Sans CN`，数字与代码 `Inter`，品牌名 `Noto Sans Mono`。
实际实现中正文用 `Inter` + 系统中文回退，原型用 `Source Han Sans CN` 是为了让中文在
画布里正常渲染，不代表要改代码里的字体栈。

---

## 4. 几何与栅格

- 窗口 **1176 × 768 DIP**（`electron/main.ts` 默认值），最小 1120 × 720
- 水平 12 列、垂直 48 行
- 三栏按份数分配：左栏 3/12（294px）· 主内容 5/12 · 右栏 4/12（默认展开，内容为运行流程阶段清单）
- 标题栏 3/48（48px）；底部面板 15/48（240px）
- 拖拽上下限：左栏 180–420px，右栏 240–560px

与 `docs/grid-system.md` 一致，原型未新增任何布局规则。

---

## 5. 维护约定

改动时注意两点：

1. **先改组件，再改屏幕。** 标题栏 / 侧栏 / 面板的改动应落在组件节点上，屏幕侧是实例，
   改实例不会回写组件。
2. **SVG 图标一旦解析即固化。** 在画布里给图标节点写 `svg` 属性只对新建节点有效；
   已解析的图标会变成 GROUP / VECTOR / ELLIPSE 子节点，改颜色要改这些子节点的
   `strokes` / `fills`，改形状则要删除后重新插入。
3. **换侧栏变体直接换源。** 用 `U(instance, {mainComponent: "新变体ID"})` 即可，
   实例会保留原索引位置与尺寸，不必 `D + I + M(…, 0)`，也不会打乱三栏顺序。
   本次 15～17 号屏即用此法从旧版 `3:60` 换到 `7:399` / `7:492`。

---

## 6. SLOT 映射两屏的数据依据与待落地契约

10、11 号屏里的车型、场景、SLOT 编号**全部取自真实文件**，不是示例数据：
`E:/WorkSpaces/projects/外置功放专用HIL/config/SLOT映射/` 下的两个 txt。

| 映射方案（文件名） | 适用车型（首行） | 媒体音 | 杜比音 | 电话音 |
| --- | --- | --- | --- | --- |
| SLOT映射（带杜比模式）.txt | SC6H / YU2 / SF海外 | SLOT 1、2 | SLOT 1–12 | SLOT 13 |
| SLOT映射（不带杜比模式）.txt | SC6E / HKE / SF海外带华为智驾 | SLOT 1、2 | `* sleep "100ms"`（无 SLOT） | SLOT 1、2 |

文件是 Gauge spec / cpt 风格的纯文本：`适用车型:` 首行、`# ` 场景标题、`* ` 步骤，
`SLOT\d+` 才是真正的通道编号。两屏按「方案 × 音源场景」组织：10 号屏用矩阵一屏看全，
11 号屏给出单方案的结构化拆解与源文本预览（语法色：`适用车型:` 橙 / `#` 绿 / `*` 蓝）。

### 与当前实现不一致的地方（按优先级）

| 优先级 | 问题 | 影响 |
| --- | --- | --- |
| P0 | `外置功放专用HIL/.hil-kit/settings.json` 的 `slotMappingPath` 指向 `.\config\SLOT映射\mapping.ini`，但该文件在目录里不存在 | SLOT 映射页必然停在「还没有配置 SLOT 映射配置文件」的空状态，等于占位 |
| P0 | `electron/business-store.ts` 的 `parseSlotMappingText` 按 `车型=slot 文件路径` 解析，且把 `#` / `;` 开头当注释 | 真实文件里的 `# 音源盒打开媒体音SLOT` 会被整行丢弃，车型也不在行首而在文件首行 `适用车型:` 里 |
| P1 | `models/slot-map.ts` 的 `SlotMappingEntry` 只有 `lines: string[]` 逐行文本 | 没有场景 / 步骤 / SLOT 编号语义，撑不起矩阵、统计和按编号筛选 |
| P1 | `SlotMapView.vue` 的搜索只匹配 `entry.vehicle` | 搜不到场景名或 SLOT 编号 |
| P2 | `sleep "100ms"` 这类非 SLOT 步骤被当普通文本 | 「不带杜比模式」没有杜比通道这一关键差异无法被显式标出 |

### 建议的数据契约（供实现侧确认）

1. `slotMappingPath` 从「单个 ini 文件」改为「目录」，扫描 `config/SLOT映射/*.txt`；
   每个文件是一个**映射方案**，文件名即方案名。
2. 解析成 `SlotMappingPlan { name, filePath, vehicles[], scenarios[] }`，
   `scenario = { title, steps[], slots: number[], nonSlotSteps[] }`。
   规则：首行 `适用车型:` 按 `/` 或中英文逗号拆分；`# ` 开新场景；`* ` 为步骤；
   `SLOT(\d+)` 提取编号；其余步骤（如 `sleep`）落到 `nonSlotSteps`。
3. 全程只读，不写回；单个文件缺失/解析失败按方案级显示黄色警告，不影响其他方案。
4. 搜索命中车型、方案名、场景标题、SLOT 编号；10 号屏矩阵的行列随实际文件数量增减。

如果实现侧决定继续沿用 `mapping.ini` 的 `车型=路径` 格式，需要先补出这个文件，
且 10、11 号屏的「方案」维度要改成「车型」维度，请回来同步调整设计稿。

---

## 7. 测试任务 / 测试队列三屏的设计依据

代码已落地：`views/NewTaskView.vue`、`views/QueueView.vue`、`stores/tasks.ts`、`stores/queue.ts`、
`electron/tasks.ts`、`src/models/task.ts`。三屏按当前实现复刻，不另造交互。

### 7.1 信息结构与栅格

| 屏 | 结构 | 栅格（12 列） |
| --- | --- | --- |
| 12 测试任务 | 操作行 → 左规格书树 / 右场景勾选 | 操作行 标题 4 · 载入已有任务 3 · 任务名称 2 · 保存 1 · 运行 2；主体 树 4 · 场景 8 |
| 13/14 测试队列 | 标题统计行 → 入队区 3 行 → 队列表格 → 底部说明 | 入队行 类型 2 · 选择 8 · 按钮 2（场景行拆成 4 + 4）；表格 顺序 1 · 类型 2 · 名称 5 · 状态 2 · 操作 2 |

12 号屏底部终端是初始提示，13 号屏是已完成项的 Gauge 输出，14 号屏是执行中输出——
三屏共用 `组件 · 底部面板`，只覆盖实例内 `;3:129` 文字，不改组件本身。

### 7.2 数据来源（真实项目）

`specs:list` 只列 `.spec`，因此树里是 3 个平级文件：`example`、`flaky_demo`、`smoke`
（`specDisplayName` 去掉 `.spec`；`specs/concepts/login.cpt` 不进这棵树）。
12 号屏选中 `example`，两个场景标题取自真实文件；`Vowel counts in single word` 的
`适用条件:示例参数-示例配置值1` 显示在行尾——按 `spec-file.ts`，首行 `适用条件:`
作用于整份规格书，之后出现的才归到单个场景，所以只有这一行有条件文字。

### 7.3 队列状态机（`stores/queue.ts`）

| 状态 | 计数标签 | 排序 | 移除 |
| --- | --- | --- | --- |
| 等待 pending | 等待 N | 可上移/下移（且相邻项也须 pending） | 可 |
| 运行中 running | 无独立计数 | 不可 | 不可 |
| 成功 success | 成功 N | 不可 | 可 |
| 失败 failed | 失败 N | 不可 | 可 |

队列只在当前应用会话内维护、不落盘；执行中可继续入队；`clearFinished` 保留 pending/running；
点击队列名称把该项输出送到底部终端。13 号屏表达「已完成 + 等待」，14 号屏表达 running 态。

### 7.4 示意数据与待确认的设计增强

**示意数据**（项目里 `.hil-kit/tasks.json` 尚未创建，任务名与部分输出为占位）：
`媒体音立体声冒烟`、`杜比通道回归` 两个任务名；13 号屏终端的 Gauge 统计行格式。
规格书文件名、场景标题、适用条件、命令结构（`gauge "run" "…" "--scenario" "…"` + 退出码）
均按真实实现填写。

**比代码多画了三处，需实现侧确认**：
1. 14 号屏标题行补了蓝色「运行中 1」计数标签 —— 代码只有等待/成功/失败三个计数，
   running 只能从表格里看到，执行时缺一个全局进度信号。
2. 14 号屏给运行中那一行加了淡蓝底 `#F0F7FF`，让当前项一眼可辨。
3. 14 号屏「开始执行」按钮改为浅蓝 loading 态（`执行中…`）——代码是 `el-button :loading`，
   视觉上等价，这里把静态稿里该表达的状态画出来。

另有一处实现现状值得留意：左侧栏「任务列表」仍是占位（`AppSidebar.vue` 注释「待接入真实数据」），
而任务已经能保存到 `tasks.json`。把已保存任务接进侧栏是成本很低、收益很直接的一步，
本次设计稿按占位如实表达，没有臆造。

---

## 8. Gauge 测试项目展示三屏（大型项目形态）

> **本章已于同日重写**。首版三屏按「示例项目的内容快照」绘制，用户指出
> 「当前展示形式不适合大型 gauge 测试项目」，故重画 15～17 号屏，首版截图不再保留。
> 改造范围与优先级经用户确认：**重画 15–17**；首要目标 **「找得到」**
> （全局搜索 + tags / 适用条件组合筛选）。当前设计以「索引 + 按需详情」为展示单元。

### 8.1 方向澄清与数据源

用户所指的「E:\oss\gauge 项目」经核准是 **Gauge 框架自身的 Go 源码仓库**（`parser/`、
`gauge/`、`wiki/`），不是带 `specs/` 的测试项目。经确认，本组三屏展示的是
**一个 Gauge 测试项目里的 spec / cpt / scenario**。因此真实数据取自
`E:/WorkSpaces/projects/外置功放专用HIL/`，框架源码只用来核对语法与数据模型：

| 用途 | 依据 |
| --- | --- |
| spec / cpt / scenario 实例 | `specs/example.spec`、`specs/smoke.spec`、`specs/flaky_demo.spec`、`specs/concepts/login.cpt` |
| 项目配置 | `manifest.json`（`Language: js`、`Plugins: html-report`）、`env/default/*.properties`（`gauge_specs_dir = specs`、`STEP_IMPL_DIR = tests`） |
| 语法与层级 | `wiki/Core-Concepts.md`、`parser/conceptParser.go`、`parser/lex.go` |
| 数据模型 | `gauge/specification.go` / `scenario.go` / `step.go` / `concept.go` / `table.go` |

### 8.2 真实项目基线（用于校验解析器，不是画布上的规模）

下表是 `外置功放专用HIL` 这个**真实示例项目**的口径，只用来核对 Gauge 语法与解析结果。
画布 15～17 号屏表达的是**大型项目的规模模拟**（246 份 spec / 1,842 个场景 / 9 个概念 /
42 处概念反向引用），三屏页头均带橙色「规模模拟」标记。规模数字、深层目录、引用次数、
增量解析耗时、索引占用均为**示意**，不是真实项目数据；文件名、`tags`、`适用条件:`、
概念标题、步骤语法、告警类型仍取自真实文件与 Gauge 规则。

| 指标 | 值 | 明细 |
| --- | --- | --- |
| `.spec` 文件 | 3 | example / smoke / flaky_demo |
| Scenario（`##`） | 6 | example 2 + smoke 3 + flaky_demo 1 |
| Spec Step（`*`） | 7 | example 3（含 1 个 spec 级 context step）+ smoke 3 + flaky_demo 1 |
| `.cpt` 文件 / Concept Heading | 1 / 1 | `concepts/login.cpt` → `# Login as <username>` |
| Concept Steps | 2 | `Set current user to <username>` / `Verify user session is active` |
| 内联数据表 | 1 | `example.spec` 的 `Word / Vowel Count`，5 行数据 |

### 8.3 为什么要重画：展示单元错了

首版以「一份文件的完整内容」为展示单元，只适合示例项目。大型项目下会整体失效：

| 首版做法 | 大型项目下的问题 |
| --- | --- |
| 15 屏把全部 spec 平铺成清单 + 4 张固定统计卡 | 几百上千份一屏装不下；统计是全量扫描的死数字，不能随筛选联动、不能下钻 |
| 16 屏把整份 spec 结构树完整铺开 | 单文件几十个场景、上百步骤就溢出；没有折叠层级、虚拟滚动、命中过滤 |
| 17 屏只画一条概念引用链 | concept 是 N:M 且可嵌套调用；看不到「改这个概念影响哪些用例」 |
| 底部面板固定常驻 240px | 占掉 31% 高度，浏览索引时纯浪费 |
| 侧栏固定 294px + 任务列表占位 | `specs/车型/功能域/...` 深层目录放不下 |

### 8.4 大型项目形态的六条信息架构原则

1. **索引优先**：默认只加载文件名 / 场景标题级索引，单文件正文点击才读取。
2. **主详情（Master-Detail）**：左侧可折叠、可虚拟滚动的索引（每层带数量与命中标记），
   右侧只显示选中项；永不一次铺开全量。
3. **筛选是一等公民**：全局搜索置顶，tags / 适用条件 / 目录 / 概念引用可组合；
   聚合条随筛选联动，数字可点击下钻。
4. **分层展开**：项目 → 目录 → spec → scenario → step，默认折叠，支持跳源文本行号。
5. **概念改为影响面分析**：反向引用列表（可分页）+ 嵌套展开树 + 未解析 / 循环引用告警。
6. **性能可见 + 空间还给内容**：增量解析、索引缓存状态、虚拟列表占位；
   底部终端改为**默认收起的可折叠抽屉**（三屏实例 `height: 37`，只留标签栏，
   `;3:128` 内容区 `visible: false`），主内容区从 443px 增到约 646px。

### 8.5 重画后的三屏结构

| 屏 | 侧栏高亮 | 信息结构 |
| --- | --- | --- |
| 15 项目浏览器 | 规格书 `7:399` | 检索头（标题 + 全局搜索框 + 规模标记）→ 组合筛选 chips → 可下钻聚合条 → 左「目录索引树」/ 右「命中结果虚拟列表」；结果按目录分组，带命中片段与行号 |
| 16 Spec 详情 | 规格书 `7:399` | 面包屑 + 筛选上下文条 → 左「场景索引（6 行，选中 1 个）」/ 右「选中场景详情」；steps 只展开当前场景，数据表与概念引用为折叠条，另有下钻 chips 与载入状态条 |
| 17 概念影响面 | 封装库 `7:492` | 检索头 → 聚合条（含未解析 / 循环引用告警）→ 左「概念索引（按被引用次数排序）」/ 右「影响面」：影响摘要、可分页反向引用列表、嵌套展开树、未解析引用明细 |

15、16 号屏沿用「规格书」选中态，17 号屏切到「封装库」，与 `navigation.ts` 的
`spec` / `concept` 两个入口一致。三屏互相串联：15 的结果行 → 16 的文件详情 →
16 的「概念引用」折叠条 → 17 的概念索引与影响面 → 17 的引用行跳回 16。

等宽字体下 `▾` / `▸` / `│` 会 fallback 成 `·` / `-` / `|`，破坏树形层级，
故树与折叠条统一改用 ASCII `[+]` / `[-]` + 空格缩进。

### 8.6 Gauge 纯文本语法在设计里的表达

| 语法 | 含义 | 设计表达 |
| --- | --- | --- |
| `# ` | Specification Heading / Concept Heading | 结构树根节点；概念定义里用橙色 |
| `## ` | Scenario Heading | 蓝色场景标题、层级条第 2 段 |
| `* ` | Step | 蓝色步骤行 |
| `适用条件:` | 条件行；文件首行作用于整份 spec，之后归单个场景 | 灰字元信息，16 号屏标注「继承 spec 顶部」 |
| `tags:` | 标签行 | 灰字元信息，长标签列表截断显示 |
| `\|…\|` | 内联数据表，作为 Table Argument 传给 step | 等宽源文本表格 |
| `<param>` | cpt 动态参数 | 17 号屏概念标题与引用行的实参列 |

### 8.7 概念引用链与影响面

```
specs/smoke.spec  L14   * Login as "demo_user"
        ↓  命中 concept heading
specs/concepts/login.cpt  L1   # Login as <username>
        ↓  参数绑定 <username> = demo_user
  1  * Set current user to "demo_user"
  2  * Verify user session is active
```

Gauge 核心里这个展开由 `Step.IsConcept = true` 与 `Step.ConceptSteps` 完成
（`gauge/step.go`），概念文件由 `parser/conceptParser.go` 解析成 `[]*gauge.Step`。

首版只把这条链画成一条，大型项目里表达不了 N:M 引用。重画后 17 号屏改为
**以概念为中心的反向视图**：左列概念索引按被引用次数排序，右侧给出
「改此概念影响 12 份 spec / 42 个场景 / 6 个 tags」的摘要、可分页的反向引用列表、
嵌套调用树，以及未解析引用与循环引用告警。引用行带实参、tags 与行号，可跳回 16 号屏。

### 8.8 与现有实现的关系（待实现侧确认）

| 优先级 | 设计里画了、代码还没有 | 说明 |
| --- | --- | --- |
| P0 | **项目级索引与增量解析** | 当前 `SpecView.vue` 是单棵树，没有「先索引、后读正文」的分层；这是其余一切的前提 |
| P0 | 全局搜索 + tags / 适用条件 / 目录组合筛选，聚合随筛选联动、可下钻 | 15 号屏的主交互，代码里没有对应能力 |
| P1 | 16 号屏的场景虚拟列表、按需载入单场景 steps、数据表与概念折叠条 | `spec/spec-file.ts` 已能解析 `##` 与 `适用条件:`，其余需扩展 |
| P1 | 17 号屏的概念索引、反向引用、嵌套展开、未解析 / 循环引用告警 | 工具台目前完全不解析 `.cpt`，需自建 concept 索引 |
| P2 | 底部终端收起/展开、增量解析进度与索引缓存状态 | 三屏已按收起态绘制，需要实现侧提供状态 |

**建议的数据契约**（在首版文档契约基础上补索引层）：

```ts
// 常驻内存的轻量索引：只含定位信息，不含 step 正文
interface SpecIndexEntry { filePath: string; heading: string; condition?: string;
                           tags: string[]; scenarioCount: number; hitCount?: number }
interface ScenarioIndexEntry { specPath: string; heading: string; lineNo: number;
                               tags: string[]; condition?: string }
interface ConceptIndexEntry { filePath: string; heading: string; params: string[];
                              referenceCount: number; stepCount: number }
interface ProjectIndex { specs: SpecIndexEntry[]; scenarios: ScenarioIndexEntry[];
                         concepts: ConceptIndexEntry[]; unresolvedRefs: UnresolvedRef[];
                         cycles: ConceptCycle[]; builtAt: string; incremental: boolean }

// 按需读取，只在用户展开时加载
interface SpecDocument { filePath: string; heading: string; condition?: string;
                         tags: string[]; contexts: Step[]; scenarios: Scenario[] }
interface Scenario { heading: string; lineNo: number; condition?: string;
                     tags: string[]; steps: Step[]; table?: DataTable }
interface Concept { filePath: string; heading: string; params: string[]; steps: Step[] }
interface ConceptReference { specPath: string; lineNo: number; stepText: string;
                             conceptHeading: string; bindings: Record<string, string> }
```

关键约束：索引一次性构建、增量更新；列表只渲染可见行；`SpecDocument` 与 `Concept`
按文件缓存；影响面只基于索引计算，不触发正文读取。

与 SLOT 映射、测试任务两批一样，本次只交付设计稿与文档，未改业务代码。
另外「旧屏侧栏漂移统一刷新」仍未处理，见第 2 章。
