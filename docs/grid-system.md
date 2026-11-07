# 12 列栅格系统设计规范

本规范约束本项目**所有水平布局**——既包括页面级主要区块，也包括组件内部的水平组合容器。技术栈为 Vue 3 + Tailwind CSS 4 + Element Plus，栅格一律使用 Tailwind 原生 12 列栅格（底层 CSS Grid），**不自造第二套网格类**。

本项目是**桌面端专属应用**（Electron 外壳），不为移动端和平板做适配：不设响应式断点，栅格只有一套桌面尺寸，窗口最小可用尺寸由 Electron 主进程保证（`minWidth: 1120`、`minHeight: 720`）。

---

## 1. 三层结构

页面与任何水平组合容器都遵循「容器 Container → 行 Row → 列 Column」：

```html
<!-- Container：桌面外壳铺满窗口，不设最大宽度与内边距 -->
<div class="h-dvh w-full">
  <!-- Row：把空间切成 12 列；页面级区域直接贴合，不留沟槽 -->
  <div class="grid h-full grid-cols-12 gap-0">
    <!-- Column：负责承载内容 -->
    <div class="col-span-2">…</div>
    <div class="col-span-7">…</div>
    <div class="col-span-3">…</div>
  </div>
</div>
```

对应到 Tailwind 的类：

| 角色 | 类名 | 说明 |
| --- | --- | --- |
| 容器（桌面外壳） | `h-dvh w-full` | 铺满窗口，不设最大宽度、不设内边距 |
| 容器（独立内容页 / 弹窗内容） | `mx-auto w-full max-w-7xl px-6` | 需要居中阅读感的页面才用，最大 1280px、左右 24px |
| 行（页面级） | `grid grid-cols-12 gap-0` | 12 条等宽轨道，区域之间贴合，用 1px 分隔线划分 |
| 行（组件级） | `grid grid-cols-12 gap-2` / `gap-3` | 组件内部按比例分配空间时使用 |
| 列 | `col-span-N` | N ∈ 1…12，一行内所有 span 之和不得超过 12；桌面端不写断点前缀 |

如果项目将来改用 Sass/CSS Module 手写，等价实现是：

```css
.container { width: 100%; max-width: 1200px; margin-inline: auto; padding-inline: 24px; }
.grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; }
.col-4 { grid-column: span 4; }
.col-6 { grid-column: span 6; }
.col-12 { grid-column: span 12; }
```

---

## 2. 桌面端单一尺寸（不做响应式）

本项目是桌面端专属应用，**不设断点、不做移动端适配**：

| 项 | 约定 |
| --- | --- |
| 栅格 | 始终 12 列，列跨度使用固定 `col-span-N`，不写 `sm:` / `md:` / `lg:` / `xl:` 前缀 |
| 窗口尺寸 | Electron 主进程保证 `minWidth: 1120`、`minHeight: 720`，默认 `1440 × 900` |
| 最小窗口下的表现 | 仍需无横向溢出：列内文本用 `truncate` / `min-w-0`，控件宽度必须能被列容纳 |
| 移动端 / 平板 | 不实现，也不为它们保留样式分支 |

判定标准：在 1120px 宽的窗口下所有 span 之和仍为 12、主要区域不挤压、页面不出现横向滚动条。

---

## 3. 沟槽（gutter）

- 间距**只由 `gap` 提供**，禁止给单个子元素写不同 `margin` 来模拟列间距。
- 同一行内 `gap` 必须一致，按行级别区分：
  - **页面级行 `gap-0`**：左栏、中列、右栏之间直接贴合，用 1px 分隔线（`border-r` / `border-l`）划分；中列内部的 `main_content` 与 `panel` 之间同样贴合，用 `border-t` 划分。桌面 IDE 式外壳不留沟槽。
  - **卡片级行 `gap-3`**（12px）：卡片内部的分组行。
  - **微组件行 `gap-1`～`gap-2`**：工具栏、标签组、列表行等紧凑控件行。
- 纵向间距在纵向容器上用 `gap-*` / `space-y-*` 表达，不要靠零散 margin 拼接。


---

## 4. 列高与对齐

- 行内列高允许不同，但同一行应统一对齐基线或顶部：行上使用 `items-start` / `items-center` / `items-stretch` 中的一种，并保持一致。
- 容器只管最大宽度与居中；行只管列分组；列只管内容。不要把 `max-width` 或 `margin-inline` 写到列上。

---

## 5. 组件级合规：A / B / C 三种方案

**所有水平组合容器**（导航栏、页头、页脚、按钮组、操作栏、工具栏、表单行、搜索栏、筛选栏、卡片内的标题区/描述区/操作区、统计块、图标 + 文字组合、列表项、标签组、分页器、弹窗、抽屉、面板内部布局）必须采用下述三种方式之一，并在代码里用注释标注所用方案。

### A. 嵌套 12 列栅格（默认方案）

组件内部新建一个 Row，重新建立 12 列，子元素用 span 控制。

适用：子元素之间**需要按比例分配空间**的组合容器——工具栏、卡片头（左标题 + 右操作）、列表行（名称 + 状态）、瓦片网格、表单行、统计块。

```html
<!-- @grid A：工具栏内部 Row（桌面单一尺寸，不写断点前缀） -->
<div class="grid h-10 grid-cols-12 items-center gap-2">
  <RegionToggle class="col-span-1 justify-self-start" />   <!-- Column：span-1 -->
  <span class="col-span-6 truncate">工作区 / 首页</span>      <!-- Column：span-6 -->
  <ThemeSwitcher class="col-span-3 justify-self-end" />     <!-- Column：span-3 -->
  <button class="col-span-1 justify-self-end">…</button>    <!-- Column：span-1 -->
</div>
```

要点：

- 子元素的 span 之和在同一行内 ≤ 12；留空用 `col-start-*` 显式占位，不要用 `ml-auto`。
- 子元素在列内需要贴边时用 `justify-self-start` / `justify-self-end`，**不要**改用 `justify-between`。
- 内容固有尺寸的子元素（按钮、标签、图标）放在声明的列内不拉伸，列宽必须容得下它；容不下说明 span 分配有误，要重新分配而不是加固定宽度。

### B. 对齐父级 12 列轨道

组件的内部元素不另建网格，但必须落在**父级**的列轨道边界上，不得随意偏移。

适用：内容固有尺寸、根本不参与宽度分配的小组——按钮组、标签组、图标 + 文字单元、分页器。这类小组整体作为一个单元放进父级的一个 Column（通常是 `col-span-12` 或 `col-span-N`），内部只使用一个统一的 `gap`，起点与父级列轨道对齐。

```html
<!-- @grid B：按钮组整体对齐父级列轨道，内部只有统一 gap -->
<section class="grid grid-cols-12 gap-3">
  <div class="col-span-12 flex flex-wrap items-center gap-3">
    <el-button type="primary">主要操作</el-button>
    <el-tag type="success">状态</el-tag>
    <badge />
  </div>
</section>
```

判定标准：这一组元素是否会争夺同一行空间？不会（各自取固有宽度）→ 用 B。会 → 用 A。

### C. 复用框架栅格

如果项目引入 Bootstrap / Ant Design Grid 等带 12 列系统的框架，直接使用其 `Row` / `Col` 与 gutter 类，不得再自造一套 `col-4` / `col-6`。

当前项目只使用 Tailwind，因此 C 仅作为将来换框架时的约束；Element Plus 本身不提供 12 列栅格，`el-row` / `el-col` 的 `span` 语义是 24 列，**禁止混用**（需要 12 列时用 Tailwind，不用 `el-row`）。

---

## 6. 原子元素规则

单个按钮、单个图标、单行文字不强制单独分配 span，但：

- 必须放在某个 Column 内，或与父级列轨道对齐；
- 不得因自身固定宽度破坏整体栅格——控件宽度必须能被所在列容纳；
- 容不下时，正确做法是调整 span 或改用紧凑形态（如下拉替换分段控件），禁止给控件加固定宽度把列撑歪。

---

## 7. 判定表（照表落地即可）

| 水平组合容器 | 方案 | 备注 |
| --- | --- | --- |
| 页面主区块（左栏 / 主内容 / 右栏） | A | 页面级 Row，`gap-0` + 1px 分隔线 |
| 工具栏、操作栏 | A | 卡片级 Row，`gap-2` |
| 卡片头（标题 + 右侧操作） | A | 标题 span 大、操作用 `justify-self-end` |
| 列表行（名称 + 状态/元信息） | A | 名称 span-8、状态 span-4 |
| 瓦片网格 | A | 两列即 `col-span-6`，四列即 `col-span-3` |
| 表单行、搜索栏、筛选栏 | A | 标签 span-N、控件 span-12−N |
| 按钮组、标签组、分页器 | B | 整组占一列，内部统一 `gap` |
| 图标 + 文字组合 | B | 作为原子单元放入列内 |
| 单个按钮 / 图标 / 单行文字 | 原子 | 置于列内或对齐轨道 |
| 弹窗、抽屉、面板内部 | A 或 B | 按是否分配宽度选 |

---

## 8. 禁止清单

- 只用 `flex: 1` 或 `justify-between` 随意分配宽度，却不声明栅格方案；
- 用固定像素宽度（`w-60`、`w-[280px]`）拼组件内部或页面主要水平布局；
- 按钮、输入框、卡片内元素各自写不同 `margin` 来模拟间距；
- 只给页面大区块加栅格，小组件内部完全脱离栅格；
- 在 Row 下直接放内容而不包 Column；
- 主要布局使用 `absolute` / `fixed` 定位（局部微调如角标、浮层允许）；
- 同一行内 span 之和超过 12；
- 在页面级区域之间加沟槽（桌面外壳必须贴合，用分隔线划分）。

---

## 9. 当前壳层的栅格映射

页面级（`src/App.vue`，Row `grid grid-cols-12 gap-0`，区域之间 1px 分隔线）：

| 区块 | span | 侧栏收起时的补齐 |
| --- | --- | --- |
| 左栏 sidebar | `col-span-2` | — |
| 主内容 main | `col-span-7` | `col-span-9` / `10` / `12` |
| 右栏 second sidebar | `col-span-3` | — |

主内容列内部的 `main_content` 与 `panel` 是**同一列内的上下分段**（纵向），不占用水平栅格：`main_content` 用 `flex-1`，`panel` 占列高 34%，两者贴合、以 `border-t` 分隔。

组件级：

| 组件 | 容器 | 方案 | span 分配 |
| --- | --- | --- | --- |
| 标题栏（AppTitleBar） | 水平 Row | A | 左栏按钮 1 · 标题 5 · 主题 2 · 面板按钮 1 · 右栏按钮 1 · 窗口控制 2 |
| └ 窗口控制按钮组 | 按钮组 | B | 整组占 span-2，三个按钮定宽、内部间距 0，右缘贴窗口边缘 |
| 工具栏（App.vue） | 水平 Row | A | 左栏按钮 1 · 面包屑 6 · 主题 3 · 面板按钮 1 · 右栏按钮 1 |
| 面板标签栏（AppPanel） | 水平 Row | A | 标签组 8 · 占位说明 4（`justify-self-end`） |
| 品牌行（AppSidebar） | 水平 Row | A | 标识 2 · 名称 10 |
| 导航项（AppSidebar） | 水平 Row | A | 图标 2 · 文字 10 |
| 任务列表头（AppSidebar） | 水平 Row | A | 标题 8 · 计数 4（`justify-self-end`） |
| 快捷卡片网格（AppSecondSidebar） | 瓦片 Row | A | 每卡 `col-span-6` |
| 插件行（AppSecondSidebar） | 水平 Row | A | 名称 8 · 状态 4 |
| 示例按钮组（HomeView） | 小组 | B | 整组 `col-span-12`，内部统一 `gap-3` |

---

## 10. 提交前自检

1. **主要水平布局**是否都走了 `grid-cols-12` + `col-span-*`？有没有残留的 `flex-1` 抢宽或 `justify-between` 撑开？
2. 每个水平组合容器是否都标注了 A / B / C？有没有小组件内部完全脱离栅格？
3. 有没有用固定像素宽度拼水平布局？控件固有宽度是否超出了它所在的列？
4. 同一行 span 之和是否 ≤ 12？留空是否用 `col-start-*` 而不是 margin？
5. 有没有误加断点前缀（`sm:` / `md:` / `lg:` / `xl:`）？桌面端只应有一份尺寸。
6. 窗口最小尺寸（1120 × 720）下是否仍有横向溢出（`scrollWidth > innerWidth`）？
7. 主要布局是否零 `absolute` / `fixed`？
8. 沟槽是否只由 `gap` 提供，且同一行内一致？页面级区域之间是否已贴合（`gap-0` + 分隔线）？

---

## 11. 常见反例

```html
<!-- ✗ 反例：flex 抢宽 + justify-between，没有栅格方案 -->
<div class="flex items-center justify-between">
  <span>工作区 / 首页</span>
  <div class="flex gap-1">…</div>
</div>

<!-- ✓ 正例：A 方案，每个元素落在声明的列里 -->
<div class="grid grid-cols-12 items-center gap-2">
  <span class="col-span-9 truncate">工作区 / 首页</span>
  <div class="col-span-3 justify-self-end">…</div>
</div>
```

```html
<!-- ✗ 反例：固定像素宽度拼侧栏，沟槽靠 margin -->
<aside class="w-60 shrink-0 border-r">…</aside>

<!-- ✓ 正例：列宽来自栅格轨道，桌面端不写断点前缀 -->
<aside class="col-span-2 border-r">…</aside>
```

```html
<!-- ✗ 反例：页面级区域之间留 24px 沟槽 -->
<div class="grid grid-cols-12 gap-6">
  <aside class="col-span-2 rounded-lg">…</aside>
</div>

<!-- ✓ 正例：区域贴合，靠分隔线划分 -->
<div class="grid grid-cols-12 gap-0">
  <aside class="col-span-2 border-r border-line">…</aside>
</div>
```

```html
<!-- ✗ 反例：内容固有尺寸的组用 justify-between 撑开两端 -->
<div class="flex justify-between"><span>终端</span><span>panel 占位</span></div>

<!-- ✓ 正例：A 方案声明两端各占几列 -->
<div class="grid grid-cols-12 items-center gap-2">
  <div class="col-span-8">终端</div>
  <span class="col-span-4 justify-self-end">panel 占位</span>
</div>
```
