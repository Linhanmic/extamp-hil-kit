/**
 * 出声位置文件的生成：把结构化场景写回文本。
 *
 * 格式与读取侧（electron/business-store.ts 的 parseOutputText）一致：
 *   `# 场景标题` 开新场景；`适用车型:车型/车型` 声明适用范围（不写表示全部车型）；
 *   `* 步骤` 是步骤行，`speak="…"` / `no_speak="…"` 就写在步骤行里，原样保留，
 *   读取时再从步骤里提取关键字。场景之间空一行。
 */
import type { OutputScenario } from '@/models/output'

export function serializeOutputScenarios(scenarios: OutputScenario[]): string {
  const blocks: string[] = []
  for (const scenario of scenarios) {
    const lines: string[] = [`# ${scenario.title.trim() || '未命名场景'}`]
    if (!scenario.allVehicles && scenario.vehicles.length) {
      lines.push(`适用车型:${scenario.vehicles.join('/')}`)
    }
    for (const step of scenario.steps) {
      const text = step.trim()
      if (text) lines.push(`* ${text}`)
    }
    blocks.push(lines.join('\n'))
  }
  return blocks.length ? `${blocks.join('\n\n')}\n` : ''
}
