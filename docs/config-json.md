# config.json 结构

配置参数页的数据落盘文件，位置 `<Gauge 项目>/.hil-kit/config.json`，与 `requirements.json` 同目录。配置项与配置值**全部由「配置参数」页面手工维护**（不从 Excel 导入），本文件只约定落盘结构；机器可校验的版本见 [config.schema.json](config.schema.json)。

## 维护语义

- 这是「编辑器」模型，不是导入式全量替换：页面每次新增 / 修改 / 删除后把整份文件写回（读 → 改 → 写），`configurations` 整体覆盖。
- **首次保存**建文件，`createdAt` 与 `updatedAt` 都写本次保存时间；**之后每次保存**只刷新 `updatedAt`，`createdAt` 保持不变。
- 写入前做一次校验，任一项不过就不写文件、页面报错：结构合法、`config_key` 唯一、同一配置项内 `value` 唯一、`manual_vehicles` 去重且非空。
- 变体引用的存在性**不在写入时强制**：需求重新导入后旧引用会失效，读到时标记出来即可，不能因为一条失效引用把整份配置卡住不让保存。新增引用由页面的变体选择器保证指向真实变体。
- 文件损坏、版本不支持或结构不对 → 页面按 error 处理并提示重新维护，不把半份数据当可信对象。

## 读取时机

应用启动、切换项目时由主进程读一次当前项目的 `config.json`（IPC `configs:load`），渲染层 `stores/configs.ts` 缓存并在配置参数页展示，保存成功后自动刷新。切换 / 解绑项目时清空缓存，避免把上一个项目的配置当当前项目的。

## 结构与约束

- `configurations` 的数组顺序就是页面展示顺序；`config_key` 全文件唯一，作为配置项主键。
- 同一配置项下 `config_value[].value` 唯一。配置值的身份是 `config_key + value`，不另设 ID。
- `relay_variants` **只存引用** `{ requirement_id, variant_key }`，配置值的适用车型通过引用解析得到，变体内容与车型以 `requirements.json` 为准。
- `manual_vehicles` 是在页面直接填写的车型（不来自任何变体），用来覆盖「特殊配置项没有对应需求」的情况。
- 配置值的**生效车型 = 关联变体的 `vehicles` ∪ `manual_vehicles`**，由读取方计算，不落盘。
- 需求还没导入、或需求重新导入后该变体已不存在时，引用标记为**失效**：页面用状态标签提示，保存时保留引用、不静默删除，由用户决定移除还是重新关联。

## JSON Schema（2020-12）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "外置功放 HIL 配置参数",
  "type": "object",
  "required": ["schemaVersion", "createdAt", "updatedAt", "configurations"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 1, "description": "结构版本，结构变更时递增" },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "首次保存时间，ISO 8601 UTC；后续保存不变"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "最近一次保存时间，ISO 8601 UTC"
    },
    "configurations": {
      "type": "array",
      "items": { "$ref": "#/$defs/configuration" },
      "description": "按页面展示顺序排列；config_key 全文件唯一"
    }
  },
  "$defs": {
    "configuration": {
      "type": "object",
      "required": ["config_key", "config_value"],
      "additionalProperties": false,
      "properties": {
        "config_key": {
          "type": "string",
          "minLength": 1,
          "description": "配置项名称，全文件唯一，作为配置项主键；首尾空白在写入前去掉"
        },
        "config_value": {
          "type": "array",
          "items": { "$ref": "#/$defs/configValue" },
          "description": "配置值按页面展示顺序；同一配置项下 value 唯一"
        }
      }
    },
    "configValue": {
      "type": "object",
      "required": ["config_key", "value", "relay_variants", "manual_vehicles"],
      "additionalProperties": false,
      "properties": {
        "config_key": {
          "type": "string",
          "minLength": 1,
          "description": "冗余字段，与所属配置项的 config_key 相同；保留是为了与 src/models/common.ts 的 ConfigValue 一致，读写不需要字段映射"
        },
        "value": {
          "type": "string",
          "minLength": 1,
          "description": "配置值，如「14扬声器」；同一配置项下唯一，首尾空白在写入前去掉"
        },
        "relay_variants": {
          "type": "array",
          "items": { "$ref": "#/$defs/variantRef" },
          "uniqueItems": true,
          "description": "关联的需求变体引用，配置值通过它们得到适用车型；不存变体内容与车型快照"
        },
        "manual_vehicles": {
          "type": "array",
          "uniqueItems": true,
          "items": { "type": "string", "minLength": 1 },
          "description": "页面里直接填写、不来自需求变体的车型；车型名沿用需求表的归一化写法（去引号、去空白、下划线换成连字符）"
        }
      }
    },
    "variantRef": {
      "type": "object",
      "required": ["requirement_id", "variant_key"],
      "additionalProperties": false,
      "properties": {
        "requirement_id": {
          "type": "string",
          "minLength": 1,
          "description": "需求ID，取自 requirements.json 的 requirements[].id"
        },
        "variant_key": {
          "type": "string",
          "description": "变体键，取自该需求下 variants[].key；空串表示该需求「无变体差异」的那一支，是合法取值"
        }
      }
    }
  }
}
```

## 示例

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-11-08T02:10:00.000Z",
  "updatedAt": "2026-11-08T03:26:00.000Z",
  "configurations": [
    {
      "config_key": "扬声器配置",
      "config_value": [
        {
          "config_key": "扬声器配置",
          "value": "14扬声器",
          "relay_variants": [
            { "requirement_id": "SwRS_AMP_Handeshake_001", "variant_key": "变体1" }
          ],
          "manual_vehicles": []
        },
        {
          "config_key": "扬声器配置",
          "value": "10扬声器",
          "relay_variants": [],
          "manual_vehicles": ["SC6H", "YU2"]
        }
      ]
    },
    {
      "config_key": "功放型号",
      "config_value": [
        {
          "config_key": "功放型号",
          "value": "AMP-A",
          "relay_variants": [
            { "requirement_id": "SwRS_AMP_Handeshake_001", "variant_key": "" }
          ],
          "manual_vehicles": []
        }
      ]
    }
  ]
}
```

## 说明

- **只存变体引用，不存变体快照**：需求表会重新导入，快照会和 `requirements.json` 打架。引用 `(requirement_id, variant_key)` 后，需求一更新，配置值的车型自动跟着变；引用不到的变体明确标记失效，比悄悄用旧数据好。
- **车型不落盘**：`vehicles` 是可计算出来的值（关联变体车型 ∪ 手工车型），按 [data-model.md](data-model.md) 的「派生字段」约定不进文件。需要车型清单时从变体侧汇总。
- **`variant_key` 可以是空串**：需求表里「整行都写 `●`、没有变体描述」的情况会合并成一个 `key` 为空串的变体，它是合法变体，不是缺字段。
- **`configValue.config_key` 是冗余字段**：与 `Variant.requirement_id` 同理，保留它是为了落盘结构与 `src/models/common.ts` 的模型逐字段对应，读写不需要做字段映射。
- **车型名来源**：从 `requirements.json` 各变体的 `vehicles` 汇总去重，或用户在输入框里直接填；两边都用需求表的归一化写法，避免「`SC6H` 与 `SC6H `」这种同一车型的两个写法。手工输入的车型不做去引号 / 下划线换算以外的猜测，只做 trim。
- **与 tauri-app 的差异**：那边配置项叫 `config_item`、配置值与需求变体解耦、靠 CSV/Excel 导入并全量替换，还有一张变体 × 配置项的映射表；本仓库沿用 `config_key` 命名、配置值与变体是直接引用、只做页面手工维护，映射所需的信息（哪个变体对应哪个配置值）由 `relay_variants` 本身承载，不再单开映射表。
- **与现有模型的差异（实现时同步）**：`src/models/common.ts` 里 `ConfigValue.relay_variants` 是 `Variant[]`、另有 `vehicles: string[]`。按本文件，`relay_variants` 改为 `VariantRef[]`（`{ requirement_id, variant_key }`），`vehicles` 改为 `manual_vehicles`，生效车型由 store 层计算。
