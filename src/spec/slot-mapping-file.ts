/**
 * SLOT 映射文件的生成：一个方案一个 txt。
 *
 * 格式与读取侧（electron/business-store.ts 的 parseSlotMappingFileText）一致：
 *   首行 `适用车型:车型/车型`（可为空，表示不限车型），空一行后每个 `# 音源场景`
 *   带若干 `* 步骤` 行；通道号写在步骤里的 `SLOT数字`，读取时提取。
 */

/** 一个方案的场景输入：只有标题与步骤，SLOT / 非 SLOT 步骤由读取侧重新解析 */
export interface SlotPlanScenarioInput {
  title: string
  steps: string[]
}

export function serializeSlotMappingPlan(
  vehicles: string[],
  scenarios: SlotPlanScenarioInput[],
): string {
  const lines: string[] = []
  if (vehicles.length) lines.push(`适用车型:${vehicles.join('/')}`)

  for (const scenario of scenarios) {
    const block: string[] = [`# ${scenario.title.trim() || '未命名场景'}`]
    for (const step of scenario.steps) {
      const text = step.trim()
      if (text) block.push(`* ${text}`)
    }
    if (lines.length) block.unshift('')
    lines.push(...block)
  }

  return lines.length ? `${lines.join('\n')}\n` : ''
}
