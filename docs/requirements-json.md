# requirements.json 结构

需求导入的落盘文件，位置 `<Gauge 项目>/.hil-kit/requirements.json`。解析规则见 README 的「需求导入」，本文件只约定落盘结构。

## 导入语义

- **首次导入**：建文件，`createdAt` 与 `updatedAt` 都写本次导入时间。
- **再次导入**：同一份文件是**更新**——`createdAt` 保持首次导入时间，`updatedAt` 刷新，`requirements` 整体替换（全量覆盖，不追加、不合并旧数据）。
- 文件内容无法解析时按首次导入处理，重新生成 `createdAt`。
- 文件里不记录来源 Excel 路径、列配置、车型全集，也不写导入统计与告警（这些属于导入时的诊断信息，或可从需求数据派生）。

## 读取时机

应用启动、切换项目时由主进程读一次当前项目的 `requirements.json`（IPC `requirements:load`），渲染层 `stores/requirements.ts` 缓存并在需求页展示：

- 文件不存在 → `empty`，需求页显示空状态「该项目还没有导入需求」。
- 文件损坏、版本不支持或结构不对 → `error`，页面提示重新导入，不把半份数据当可信对象。
- 预览数据只存在于导入弹窗里；页面上展示的始终是已保存的数据，导入成功后自动刷新。

## JSON Schema（2020-12）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "外置功放 HIL 需求数据",
  "type": "object",
  "required": ["schemaVersion", "createdAt", "updatedAt", "requirements"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 1, "description": "结构版本，结构变更时递增" },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "首次导入时间，ISO 8601 UTC；后续导入不变"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "最近一次导入时间，ISO 8601 UTC"
    },
    "requirements": {
      "type": "array",
      "items": { "$ref": "#/$defs/requirement" },
      "description": "按需求表中首次出现的行顺序排列"
    }
  },
  "$defs": {
    "requirement": {
      "type": "object",
      "required": ["id", "name", "detail", "variants"],
      "additionalProperties": false,
      "properties": {
        "id": { "type": "string", "minLength": 1, "description": "需求ID，全表唯一" },
        "name": { "type": "string", "description": "需求名称" },
        "detail": { "type": "string", "description": "需求详情原文，保留换行" },
        "variants": {
          "type": "array",
          "items": { "$ref": "#/$defs/variant" },
          "description": "变体按首次出现顺序；同一 key 只出现一次"
        }
      }
    },
    "variant": {
      "type": "object",
      "required": ["requirement_id", "key", "content", "vehicles"],
      "additionalProperties": false,
      "properties": {
        "requirement_id": { "type": "string", "minLength": 1 },
        "key": {
          "type": "string",
          "description": "内容键：变体描述经 NFKC 归一后去掉控制字符、空白、标点；空串表示该需求在这些车型上无变体差异"
        },
        "content": {
          "type": "array",
          "items": { "type": "string" },
          "description": "该变体的全部原始写法，去重、按首次出现顺序；无变体差异时为 []"
        },
        "vehicles": {
          "type": "array",
          "uniqueItems": true,
          "items": { "type": "string" },
          "description": "该变体适用的车型名；表头归一化后的写法"
        }
      }
    }
  }
}
```

## 示例（节选）

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-11-07T07:30:00.000Z",
  "updatedAt": "2026-11-07T07:42:00.000Z",
  "requirements": [
    {
      "id": "SwRS_AMP_Handeshake_001",
      "name": "功放握手",
      "detail": "前提条件：原始模型直接推理\n输入：机器本身的硬件和驱动支持…",
      "variants": [
        {
          "requirement_id": "SwRS_AMP_Handeshake_001",
          "key": "变体1",
          "content": ["变体1"],
          "vehicles": ["HFAF", "EFSS"]
        },
        {
          "requirement_id": "SwRS_AMP_Handeshake_001",
          "key": "变体2",
          "content": ["变体2"],
          "vehicles": ["FASLF带华为智驾", "HCHE", "HCHE-01"]
        }
      ]
    }
  ]
}
```

## 说明

- **车型全集不落盘**：上百个车型的需求表如果把全集也存一份，文件体积会翻倍；需要车型清单时从 `requirements[].variants[].vehicles` 汇总去重即可。注意这样一来，「一条需求都不涉及」的车型不会出现在文件里——这类车型本来也没有需求映射可查。
- `Variant.requirement_id` 在 `requirements[]` 里是冗余的，保留它是为了与 `src/models/common.ts` 的 `Variant` 完全一致，读写时不需要字段映射。
- 平台列（表头含「平台」）的单元格既不计适用也不计不适用，不产生变体，其表头也不出现在任何 `vehicles` 里。
- `vehicles` 里的名字经过归一化：去引号、去空白（含 NBSP 与全角空格）、`_` 换算成 `-`；表头按 `/`、`、`、`,`、`，`、`;`、`；` 拆成多款车型。
- 解析结果（`RequirementsParseResult.vehicles`）仍然带车型全集，供导入界面预览与统计用，只是不写入文件。
- 校验实现见 `electron/requirements-store.ts`（写入）与 `electron/__tests__/requirements-store.spec.ts`（结构断言）。
