# gauge-sample

一个最小的 **Gauge 测试框架项目**，用于验证应用启动页的「选择 Gauge 项目」流程。

目录结构遵循 Gauge 约定：

```
manifest.json                  Gauge 项目标记（Language / Plugins）
specs/smoke.spec               示例 spec
env/default/default.properties 运行环境默认参数
```

应用在启动页选择本目录（`fixtures/gauge-sample`）即可通过校验并进入主界面——
校验规则见 `electron/workspace.ts`：目录包含 `manifest.json` 或 `.gauge`。

如果本机装了 Gauge CLI，可以直接运行：

```sh
cd fixtures/gauge-sample
gauge run specs
```

报告输出到 `reports/`（已忽略，不进版本库）。
