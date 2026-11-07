# 数据模型模块

本文件说明 `src/models/` 的组织方式与约定。业务字段以数据建模为准，建模确定后再逐个领域补文件。

## 目录与命名

```
src/models/
  index.ts      桶文件：统一对外导出
  common.ts     共享基础类型（ID / 时间戳 / 实体基类 / 分页）
  <domain>.ts   每个领域一个文件，一组模型放一起
```

领域文件命名用短横线复数形式，与侧栏业务入口大致对应，例如 `tasks.ts`（新建任务）、`slot-maps.ts`（SLOT 映射）、`outputs.ts`（出声位置）、`meters.ts`（音量表）、`snapshots.ts`（快照）、`configs.ts`（配置参数）、`requirements.ts`（需求）。

新增模型的步骤：

1. 在 `src/models/<domain>.ts` 中定义接口，复用 `common.ts` 的 `EntityBase` / `EntityId` / `IsoDateTime`；
2. 在 `index.ts` 用 `export type * from './<domain>'` 暴露；
3. 需要跨进程（Electron 主进程读写）的模型，保持纯类型、不加运行时代码。

## 约定

| 项 | 约定 |
| --- | --- |
| 只放类型 | 本模块不产出运行时代码（不写常量表、不写构造函数）。类型在编译期擦除，主进程可安全复用 |
| 实体基类 | 所有可持久化实体继承 `EntityBase`（`id` + `createdAt` + `updatedAt`），时间统一 ISO 8601 UTC 字符串 |
| ID | 统一字符串 `EntityId`，用 UUID v4 或稳定业务键；不要用自增数字 |
| 单位 | 物理量必须带单位后缀并在注释里写明：`voltageV`、`SplDb`、`frequencyHz`、`levelDbfs` 等，禁止裸 `value` |
| 可空 | 用 `null` 表示“明确没有值”，`undefined` 只用于可选字段缺省 |
| 枚举 | 用字符串字面量联合类型，不用 TS `enum`（便于 JSON 序列化与跨进程传输） |
| 派生字段 | 不存可计算出的值（如总时长、均值），由视图层计算，避免持久化数据不一致 |

## 与主进程 / 持久化的关系

- 数据文件的读写放在主进程（`electron/`），参照 `electron/workspace.ts` 的做法：`userData` 下按领域分文件，读写失败不阻塞会话。
- 主进程不能识别 `@` 别名（vite-plugin-electron 以独立配置打包主进程），复用类型时用相对路径：

  ```ts
  // electron/tasks.ts
  import type { EntityBase } from '../src/models/common'
  ```

  必须是 `import type`，否则会把渲染层代码打进主进程。
- 跨 IPC 的数据建议在边界做一次结构校验（例如 zod schema 或手写守卫），避免把外部/历史数据直接当可信对象。

## 前端消费方式

- 只读派生状态、跨组件共享的领域数据用 Pinia store（`src/stores/`），store 内部的字段类型直接取自 `src/models`。
- 一次性查询走 composable（`src/composables/`），不要把 store 当请求缓存。
- mock 数据放 `fixtures/` 或各领域文件旁的 `__mocks__`，不要混进模型定义。

## 待补充

数据建模（字段、主键、关联关系、枚举取值、单位）确认后按领域落地，并在本文件追加一张「领域 → 文件」对照表。
