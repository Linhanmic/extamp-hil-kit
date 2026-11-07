# settings.json 结构

设置页的数据落盘文件，位置 `<Gauge 项目>/.hil-kit/settings.json`。设置描述的是「这个项目的数据放在哪」以及需求导入的默认参数，**按项目保存**——切换项目就跟着切换。机器可校验的版本见 [settings.schema.json](settings.schema.json)。

## 保存语义

- 设置页每次保存都把整份文件写回（读 → 改 → 写），`updatedAt` 刷新为本次保存时间；还没保存过时文件不存在，读取按默认值处理。
- 文件缺失、无法解析、版本不支持或结构不对时：**读取照样返回默认值**，只在 `error` 里说明原因，界面提示去设置页重填。设置坏了不该让整个工具台不可用。
- 写入前做一次归一化：路径去首尾空白，列号转大写并校验是 1–3 个字母，`headerRow` 必须是不小于 0 的整数；校验不过不写文件。

## 路径解析

- 路径可以写**相对项目根**的形式（如 `config/SLOT映射/mapping.ini`），也可以写绝对路径；使用时由 `resolveProjectPath` 统一解析，绝对路径原样使用。
- 需求 json 与配置参数 json 的空串表示沿用默认位置（`.hil-kit/requirements.json`、`.hil-kit/config.json`）；出声位置文件、扬声器快照目录、音量表、SLOT 映射配置文件留空表示「还没配置」，对应功能在配置前保持不可用。

## 谁在用这份设置

| 设置项 | 消费方 |
| --- | --- |
| `requirementsPath` | `requirements:load` / `requirements:save` 读写需求数据 |
| `configsPath` | `configs:load` / `configs:save` 读写配置参数 |
| `outputPath` | `output:load` 读取出声位置文件 |
| `snapshotDir` / `volumeTablePath` / `slotMappingPath` | `snapshot:load` / `meter:load` / `slot-map:load` 读取快照、音量表、SLOT 映射 |
| `conceptOutputDir` | `concepts:generate` 按车型生成 cpt；空串回落到 `specs` |
| `slotConceptOutputDir` | `concepts:generate-slot` 按车型生成 SLOT cpt；空串回落到 `specs` |
| `requirementsImport` | 需求导入弹窗：文件选择器的起始路径、工作表与列映射的默认值 |

## JSON Schema（2020-12）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "外置功放 HIL 项目设置",
  "type": "object",
  "required": ["schemaVersion", "updatedAt", "settings"],
  "additionalProperties": false,
  "properties": {
    "schemaVersion": { "const": 1, "description": "结构版本，结构变更时递增" },
    "updatedAt": {
      "type": "string",
      "description": "最近一次保存时间，ISO 8601 UTC；还没保存过时为空串"
    },
    "settings": { "$ref": "#/$defs/settings" }
  },
  "$defs": {
    "settings": {
      "type": "object",
      "required": [
        "requirementsPath",
        "configsPath",
        "outputPath",
        "snapshotDir",
        "volumeTablePath",
        "slotMappingPath",
        "requirementsImport"
      ],
      "additionalProperties": false,
      "properties": {
        "requirementsPath": {
          "type": "string",
          "description": "需求 json 的位置；相对路径按项目根解析，空串表示默认 .hil-kit/requirements.json"
        },
        "configsPath": {
          "type": "string",
          "description": "配置参数 json 的位置；相对路径按项目根解析，空串表示默认 .hil-kit/config.json"
        },
        "outputPath": { "type": "string", "description": "出声位置文件；空串表示还没配置" },
        "snapshotDir": { "type": "string", "description": "扬声器快照所在目录；空串表示还没配置" },
        "volumeTablePath": { "type": "string", "description": "音量表文件；空串表示还没配置" },
        "slotMappingPath": { "type": "string", "description": "SLOT 映射配置文件；空串表示还没配置" },
        "requirementsImport": { "$ref": "#/$defs/requirementsImport" }
      }
    },
    "requirementsImport": {
      "type": "object",
      "required": [
        "filePath",
        "sheetName",
        "headerRow",
        "idCol",
        "nameCol",
        "detailCol",
        "vehicleStartCol"
      ],
      "additionalProperties": false,
      "properties": {
        "filePath": {
          "type": "string",
          "description": "需求分析表默认路径，导入时文件选择器从这里开始；空串表示每次自己挑"
        },
        "sheetName": {
          "type": "string",
          "description": "默认工作表名；空串表示优先挑名字含「需求」的工作表"
        },
        "headerRow": {
          "type": "integer",
          "minimum": 0,
          "description": "表头行号（1 基），0 表示导入时自动探测"
        },
        "idCol": {
          "type": "string",
          "pattern": "^([A-Z]{1,3})?$",
          "description": "需求ID列（Excel 列字母，大写），空串表示自动探测"
        },
        "nameCol": { "type": "string", "pattern": "^([A-Z]{1,3})?$", "description": "需求名称列，空串表示自动探测" },
        "detailCol": { "type": "string", "pattern": "^([A-Z]{1,3})?$", "description": "需求详情列，空串表示自动探测" },
        "vehicleStartCol": { "type": "string", "pattern": "^([A-Z]{1,3})?$", "description": "车型起始列，空串表示自动探测" }
      }
    }
  }
}
```

## 示例

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-11-08T06:12:00.000Z",
  "settings": {
    "requirementsPath": ".hil-kit/requirements.json",
    "configsPath": ".hil-kit/config.json",
    "outputPath": "config/出声位置/出声位置.txt",
    "snapshotDir": "config/扬声器快照",
    "volumeTablePath": "config/音量表/test.csv",
    "slotMappingPath": "config/SLOT映射/mapping.ini",
    "requirementsImport": {
      "filePath": "docs/需求分析表.xlsx",
      "sheetName": "6、软件需求分析表",
      "headerRow": 2,
      "idCol": "A",
      "nameCol": "B",
      "detailCol": "E",
      "vehicleStartCol": "G"
    }
  }
}
```

## 说明

- **按项目存而不是按应用存**：这些路径都指向某个 Gauge 项目里的数据，把它放在应用级配置里会让「切换项目」后仍然读到上一个项目的数据，和 `requirements.json` / `config.json` 的归属方式也不一致。
- **默认值只有一份**：`src/config/settings-defaults.ts` 同时被主进程与渲染层引用，默认路径不会两边各写一套。
- **列号只存字母**：设置里的四个列位置与需求导入弹窗里的输入框一致，都是 Excel 列字母；数字列号在弹窗里输入时由主进程解析，落进设置时统一转成字母。
- **不存派生状态**：解析出来的绝对路径、车型全集、导入统计都不写进设置，需要时由路径 + 项目根算出来。
