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

音量表与快照仍与「出声位置」共用「标题行 → 搜索工具栏 → 卡片列表」骨架，参考 07 号屏。
SLOT 映射因为要一屏看清「所有映射情况 × 对应车型」，单独出 10、11 两屏，不再复用卡片列表骨架。

「新建任务」目前是占位页，功能需求未定义，本次不出图。

---

## 2. 组件库

画布底部（y = 2664 起）为可复用组件，全部屏幕均由其组装：

| 组件 | 画布节点 | 说明 |
| --- | --- | --- |
| 组件 · 标题栏 | `3:1` | 13 条轨道：标题 661 · 项目设置 83 · 设计网格 83 · 区域开关组 165 · 窗口控制 132（定宽） |
| 组件 · 左侧栏 | `3:60` | 294px 宽，品牌行 + 9 导航项 + 任务列表 + 项目栏 |
| 组件 · 底部面板 | `3:121` | 240px 高（48 行中的 15 行），标签栏 + 内容区 |
| 组件 · 屏幕骨架 | `3:130` | 标题栏 + 三栏 + 面板的完整组装 |

侧栏因「当前页」高亮不同，另存了 6 份变体（`3:963` / `3:1024` / `3:1085` / `3:1146` / `3:1207` / `3:1277`），
分别对应需求 / 配置参数 / 规格 / 出声位置 / 封装管理 / SLOT 映射。

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
- 三栏按份数分配：左栏 3/12（294px）· 主内容 5/12 · 右栏 4/12（默认收起）
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
