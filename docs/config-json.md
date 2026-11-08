# config.json 结构

配置参数页的数据落盘文件，默认位置 `<Gauge 项目>/.hil-kit/config.json`，与 `requirements.json` 同目录；可在「项目设置」里改成本项目自己的位置（[settings-json.md](settings-json.md)）。配置项与配置值**全部由「配置参数」页面手工维护**（不从 Excel 导入），本文件只约定落盘结构；机器可校验的版本见 [config.schema.json](config.schema.json)。

## 维护语义

- 这是「编辑器」模型，不是导入式全量替换：页面每次新增 / 修改 / 删除后把整份文件写回（读 → 改 → 写），`configurations` 整体覆盖。
- **首次保存**建文件，`createdAt` 与 `updatedAt` 都写本次保存时间；**之后每次保存**只刷新 `updatedAt`，`createdAt` 保持不变。
- 写入前做一次校验，任一项不过就不写文件、页面报错：结构合法、`config_key` 唯一、同一配置项内 `value` 唯一、`special_vehicles` 的 `text` 非空且同 `match+text` 去重。
- 变体引用的存在性**不在写入时强制**：需求重新导入后旧引用会失效，读到时标记出来即可，不能因为一条失效引用把整份配置卡住不让保存。新增引用由页面的变体选择器保证指向真实变体。
- 文件损坏、版本不支持或结构不对 → 页面按 error 处理并提示重新维护，不把半份数据当可信对象。`schemaVersion: 1` 的 `vehicles: string[]`（精确车型名）读入时按 `contains` 规则迁到 `special_vehicles`，写回时升为 2。

## 读取时机

应用启动、切换项目以及进入相关页面时由主进程读一次当前项目的 `config.json`（IPC `configs:load`），渲染层 `stores/configs.ts` 缓存并在配置参数页展示，保存成功后自动刷新。切换 / 解绑项目时清空缓存，避免把上一个项目的配置当当前项目的。

## 结构与约束

- `configurations` 的数组顺序就是页面展示顺序；`config_key` 全文件唯一，作为配置项主键。
- 同一配置项下 `config_value[].value` 唯一。配置值的身份是 `config_key + value`，不另设 ID。
- 配置值**不重复写 `config_key`**：归属由所在的配置项唯一确定。模型里的 `ConfigValue.config_key` 保留（便于在内存与界面里定位所属配置项），读写时由存储层按所属项补齐与去掉。
- `relay_variants` **只存引用** `{ requirement_name, variant_key }`：需求按名称匹配，变体按内容键匹配，配置值的适用车型与变体内容都从 `requirements.json` 解析，不存快照。
- `special_vehicles` 是特殊车型配置规则，只有两种：`starts_with`（车型名称以 `text` 开头）与 `contains`（车型名称包含 `text`），用来覆盖「特殊配置项没有对应需求」的情况。
- 配置值的**生效车型 = 关联变体解析出的车型 ∪ 特殊规则命中的需求车型**，由读取方计算，不落盘。
- 需求还没导入、需求重新导入后名称变了或该变体已不存在时，引用标记为**失效**；同名需求有多条时标记为**歧义**。两种情况都用状态标签提示，保存时保留引用、不静默删除，由用户决定移除还是重新关联。

## JSON Schema（2020-12）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "外置功放 HIL 配置参数",
  "description": "配置参数页手工维护的数据文件：<Gauge 项目>/.hil-kit/config.json。结构约定见 docs/config-json.md。",
  "type": "object",
  "required": ["schemaVersion", "createdAt", "updatedAt", "configurations"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 2, "description": "结构版本；v2 起特殊车型为 special_vehicles 规则，v1 的 vehicles 字符串按 contains 迁移" },
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
      "required": ["value", "relay_variants", "special_vehicles"],
      "additionalProperties": false,
      "properties": {
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
        "special_vehicles": {
          "type": "array",
          "items": { "$ref": "#/$defs/specialVehicleRule" },
          "description": "特殊车型配置规则（以…开头 / 包含…）；生效车型 = 关联变体车型 ∪ 规则命中的需求车型"
        }
      }
    },
    "specialVehicleRule": {
      "type": "object",
      "required": ["match", "text"],
      "additionalProperties": false,
      "properties": {
        "match": {
          "enum": ["starts_with", "contains"],
          "description": "starts_with=车型以 text 开头；contains=车型名称包含 text"
        },
        "text": {
          "type": "string",
          "minLength": 1,
          "description": "匹配参数，首尾空白在写入前去掉"
        }
      }
    },
    "variantRef": {
      "type": "object",
      "required": ["requirement_name", "variant_key"],
      "additionalProperties": false,
      "properties": {
        "requirement_name": {
          "type": "string",
          "minLength": 1,
          "description": "需求名称，取自 requirements.json 的 requirements[].name；同名需求有多条时该引用按歧义处理"
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
  "schemaVersion": 2,
  "createdAt": "2026-11-08T02:10:00.000Z",
  "updatedAt": "2026-11-08T03:26:00.000Z",
  "configurations": [
    {
      "config_key": "扬声器配置",
      "config_value": [
        {
          "value": "14扬声器",
          "relay_variants": [
            { "requirement_name": "功放握手", "variant_key": "变体1" }
          ],
          "special_vehicles": []
        },
        {
          "value": "10扬声器",
          "relay_variants": [],
          "special_vehicles": [
            { "match": "starts_with", "text": "SC6H" },
            { "match": "contains", "text": "YU2" }
          ]
        }
      ]
    },
    {
      "config_key": "功放型号",
      "config_value": [
        {
          "value": "AMP-A",
          "relay_variants": [
            { "requirement_name": "功放握手", "variant_key": "" }
          ],
          "special_vehicles": []
        }
      ]
    }
  ]
}
```

## 说明

- **只存变体引用，不存变体快照**：需求表会重新导入，快照会和 `requirements.json` 打架。引用 `(requirement_name, variant_key)` 后，需求一更新，配置值的车型自动跟着变；引用不到的需求或变体明确标记失效，比悄悄用旧数据好。
- **需求按名称引用**：配置页要展示的就是需求名称，按名称引用让 JSON 自解释，不用再回表查 ID。代价是两个——需求改名后旧引用失效、需求表里出现同名需求时无法区分，这两种情况都按失效 / 歧义提示，由用户重新关联，不在数据层做猜测。
- **派生车型不落盘**：`special_vehicles` 只存匹配规则，由关联变体或规则推导出的车型不进文件（按 [data-model.md](data-model.md) 的「派生字段」约定）；生效车型由读取方合并计算。
- **`variant_key` 可以是空串**：需求表里「整行都写 `●`、没有变体描述」的情况会合并成一个 `key` 为空串的变体，它是合法变体，不是缺字段。
- **配置值不落 `config_key`**：归属由所在的配置项决定，重复写一份只会带来「内层与外层不一致」的风险。模型里保留 `ConfigValue.config_key`，是为了在内存与界面里不靠外层上下文就能定位所属配置项；存储层读取时按所属项补齐、写入时去掉，落盘结构与模型因此不是逐字段对应。
- **车型名来源**：特殊规则的匹配范围是 `requirements.json` 各变体 `vehicles` 汇总去重后的全集，规则本身只做 trim 与去重。
- **与 tauri-app 的差异**：那边配置项叫 `config_item`、配置值与需求变体解耦、靠 CSV/Excel 导入并全量替换，还有一张变体 × 配置项的映射表；本仓库沿用 `config_key` 命名、配置值与变体是直接引用、只做页面手工维护，映射所需的信息（哪个变体对应哪个配置值）由 `relay_variants` 本身承载，不再单开映射表。
- **与模型的关系**：`src/models/common.ts` 里已有 `VariantRef`（`{ requirement_name, variant_key }`），`ConfigValue.relay_variants` 用的就是它；`ConfigValue.special_vehicles` 存特殊车型规则，生效车型由 store 层合并计算；`ConfigValue.config_key` 留在模型里但不落盘（见上一条）。落盘结构与模型只差这一个字段。
