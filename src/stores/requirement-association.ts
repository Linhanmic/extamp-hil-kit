import type { Configuration, Requirement, VariantRef } from '@/models'

/** 需求行的配置关联状态 */
export type RequirementAssociationStatus =
  | 'normal'
  | 'unlinked'
  | 'variant_added'
  | 'variant_removed'
  | 'variant_changed'

export interface RequirementAssociation {
  status: RequirementAssociationStatus
  /** 当前变体中已被配置值引用的变体键 */
  linkedKeys: string[]
  /** 当前变体中尚未被配置值引用的变体键 */
  unlinkedKeys: string[]
  /** 配置值仍引用、但当前需求中已不存在的变体键 */
  staleKeys: string[]
}

function refsForRequirement(
  configurations: Configuration[],
  requirementName: string,
): VariantRef[] {
  return configurations.flatMap((configuration) =>
    configuration.config_value.flatMap((value) =>
      value.relay_variants.filter((ref) => ref.requirement_name === requirementName),
    ),
  )
}

/**
 * 计算一个需求的关联状态。
 *
 * 没有任何当前关联与失效引用 → 未关联；
 * 有当前未关联变体与失效引用 → 变体变更；
 * 只有当前未关联变体（且已有其他变体被关联）→ 变体增加；
 * 只有失效引用 → 变体删除；其余 → 正常。
 * 不参与处理时仅展示正常，仍返回原始键集合供展开区显示实际关联情况。
 */
export function analyzeRequirementAssociation(
  requirement: Requirement,
  configurations: Configuration[],
  participating = true,
): RequirementAssociation {
  const referencedKeys = new Set(
    refsForRequirement(configurations, requirement.name).map((ref) => ref.variant_key),
  )
  const currentKeys = new Set(requirement.variants.map((variant) => variant.key))

  const linkedKeys = requirement.variants
    .filter((variant) => referencedKeys.has(variant.key))
    .map((variant) => variant.key)
  const unlinkedKeys = requirement.variants
    .filter((variant) => !referencedKeys.has(variant.key))
    .map((variant) => variant.key)
  const staleKeys = [...referencedKeys].filter((key) => !currentKeys.has(key))

  let status: RequirementAssociationStatus
  if (!participating) status = 'normal'
  else if (!linkedKeys.length && !staleKeys.length) status = 'unlinked'
  else if (unlinkedKeys.length && staleKeys.length) status = 'variant_changed'
  else if (unlinkedKeys.length && linkedKeys.length) status = 'variant_added'
  else if (staleKeys.length) status = 'variant_removed'
  else if (unlinkedKeys.length && !linkedKeys.length) status = 'unlinked'
  else status = 'normal'

  return { status, linkedKeys, unlinkedKeys, staleKeys }
}

/** 配置值仍引用、但需求列表里已不存在的需求名称（页级提醒） */
export function missingRequirementNames(
  requirements: Requirement[],
  configurations: Configuration[],
): string[] {
  const currentNames = new Set(requirements.map((requirement) => requirement.name))
  const missing: string[] = []
  for (const configuration of configurations) {
    for (const value of configuration.config_value) {
      for (const ref of value.relay_variants) {
        if (!currentNames.has(ref.requirement_name) && !missing.includes(ref.requirement_name)) {
          missing.push(ref.requirement_name)
        }
      }
    }
  }
  return missing
}
