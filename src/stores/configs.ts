import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  ConfigValue,
  Configuration,
  ConfigsDocument,
  Requirement,
  SpecialVehicleRule,
  VariantRef,
} from '@/models'
import { useRequirementsStore } from './requirements'

/** 变体引用的解析状态：正常 / 同名需求歧义 / 找不到需求或变体 */
export type VariantRefStatus = 'ok' | 'ambiguous' | 'missing'

/** 解析后的变体引用：车型与标签来自当前已导入的需求数据 */
export interface ResolvedVariantRef {
  requirement_name: string
  variant_key: string
  /** 展示用标签：变体序号、原始变体键，或「无变体差异」 */
  label: string
  status: VariantRefStatus
  vehicles: string[]
}

/** 解析后的配置值：生效车型、车型来源与引用状态 */
export interface ResolvedConfigValue {
  /** 生效车型 = 关联变体解析出的车型 ∪ 特殊车型规则命中的需求车型 */
  vehicles: string[]
  variantVehicles: string[]
  specialRules: SpecialVehicleRule[]
  refs: ResolvedVariantRef[]
  /** 存在失效或歧义的变体引用 */
  hasIssue: boolean
}

export interface ConfigurationValueRow extends ConfigValue {
  resolved: ResolvedConfigValue
}

/** 页面表格一行：配置项 + 解析好的配置值 */
export interface ConfigurationRow {
  config_key: string
  values: ConfigurationValueRow[]
  valueCount: number
  vehicleCount: number
  issueCount: number
}

/** 配置值编辑弹窗的输入 */
export interface ConfigValueInput {
  value: string
  relay_variants: VariantRef[]
  special_vehicles: SpecialVehicleRule[]
}

export type SaveResult = { ok: true } | { ok: false; error: string }

/**
 * 已维护的配置参数：应用启动、切换项目时从 `<项目>/.hil-kit/config.json` 读回来，
 * 每次编辑整份写回后重新读取，界面始终以盘上的数据为准（主进程会做 trim 与去重）。
 *
 * 生效车型与变体引用状态是派生的：需求数据重新导入后自动跟着变，
 * 引用不到的需求 / 变体在这里标成失效 / 歧义，交给页面提示用户重新关联。
 */
export const useConfigsStore = defineStore('configs', () => {
  const requirementsStore = useRequirementsStore()

  const document = ref<ConfigsDocument | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  /** 文件存在但不可用（损坏 / 版本不支持）或保存失败的原因 */
  const error = ref('')
  /** 是否已经尝试过读取，用于区分「还没读」与「读到了但没有数据」 */
  const loaded = ref(false)

  const configurations = computed(() => document.value?.configurations ?? [])
  const hasData = computed(() => configurations.value.length > 0)
  const configurationCount = computed(() => configurations.value.length)
  const configValueCount = computed(() =>
    configurations.value.reduce((sum, item) => sum + item.config_value.length, 0),
  )

  /** 需求名 → 同名需求列表，用于解析变体引用并识别同名歧义 */
  const requirementsByName = computed(() => {
    const map = new Map<string, Requirement[]>()
    for (const requirement of requirementsStore.document?.requirements ?? []) {
      const list = map.get(requirement.name)
      if (list) list.push(requirement)
      else map.set(requirement.name, [requirement])
    }
    return map
  })

  function refLabel(variantKey: string, index: number): string {
    if (variantKey === '') return '无变体差异'
    return index >= 0 ? `变体${index + 1}` : variantKey
  }

  function resolveRef(ref: VariantRef): ResolvedVariantRef {
    const candidates = requirementsByName.value.get(ref.requirement_name) ?? []
    if (candidates.length > 1) {
      return {
        ...ref,
        label: refLabel(ref.variant_key, -1),
        status: 'ambiguous',
        vehicles: [],
      }
    }

    const requirement = candidates[0]
    const index = requirement
      ? requirement.variants.findIndex((variant) => variant.key === ref.variant_key)
      : -1
    if (!requirement || index < 0) {
      return {
        ...ref,
        label: refLabel(ref.variant_key, -1),
        status: 'missing',
        vehicles: [],
      }
    }

    const variant = requirement.variants[index]
    return {
      ...ref,
      label: refLabel(ref.variant_key, index),
      status: 'ok',
      vehicles: variant?.vehicles ?? [],
    }
  }

  /** 需求车型全集：特殊车型规则的匹配范围（精确车型全集来自需求，不拿规则反推） */
  const requirementVehicleUniverse = computed(() => {
    const names: string[] = []
    const push = (vehicle: string) => {
      const name = vehicle.trim()
      if (name && !names.includes(name)) names.push(name)
    }
    for (const requirement of requirementsStore.document?.requirements ?? []) {
      for (const variant of requirement.variants) variant.vehicles.forEach(push)
    }
    return names
  })

  function matchSpecialVehicles(rules: SpecialVehicleRule[]): string[] {
    const result: string[] = []
    for (const vehicle of requirementVehicleUniverse.value) {
      const matched = rules.some((rule) =>
        rule.match === 'starts_with'
          ? vehicle.startsWith(rule.text)
          : vehicle.includes(rule.text),
      )
      if (matched) result.push(vehicle)
    }
    return result
  }

  function resolveValue(value: ConfigValue): ResolvedConfigValue {
    const refs = value.relay_variants.map(resolveRef)

    const variantVehicles: string[] = []
    for (const ref of refs) {
      for (const vehicle of ref.vehicles) {
        if (!variantVehicles.includes(vehicle)) variantVehicles.push(vehicle)
      }
    }

    const specialRules = value.special_vehicles
    const matchedSpecial = matchSpecialVehicles(specialRules)

    const vehicles = [...variantVehicles]
    for (const vehicle of matchedSpecial) {
      if (!vehicles.includes(vehicle)) vehicles.push(vehicle)
    }

    return {
      vehicles,
      variantVehicles,
      specialRules,
      refs,
      hasIssue: refs.some((ref) => ref.status !== 'ok'),
    }
  }

  const rows = computed<ConfigurationRow[]>(() =>
    configurations.value.map((configuration) => {
      const values = configuration.config_value.map((value) => ({
        ...value,
        resolved: resolveValue(value),
      }))
      const vehicles = new Set<string>()
      for (const value of values) {
        for (const vehicle of value.resolved.vehicles) vehicles.add(vehicle)
      }
      return {
        config_key: configuration.config_key,
        values,
        valueCount: values.length,
        vehicleCount: vehicles.size,
        issueCount: values.filter((value) => value.resolved.hasIssue).length,
      }
    }),
  )

  /** 全部配置值涉及的去重车型数 */
  const vehicleCount = computed(() => {
    const names = new Set<string>()
    for (const row of rows.value) {
      for (const value of row.values) {
        for (const vehicle of value.resolved.vehicles) names.add(vehicle)
      }
    }
    return names.size
  })

  /** 车型候选项：需求车型全集（spec 求值的全集也用它） */
  const vehicleOptions = computed(() => {
    const names = [...requirementVehicleUniverse.value]
    // 没有需求数据时，特殊规则里的 text 也作为候选提示（不参与生效车型计算）
    if (!names.length) {
      const push = (vehicle: string) => {
        const name = vehicle.trim()
        if (name && !names.includes(name)) names.push(name)
      }
      for (const configuration of configurations.value) {
        for (const value of configuration.config_value) {
          for (const rule of value.special_vehicles) push(rule.text)
        }
      }
    }
    return names
  })

  /** 变体选择器的候选：按需求分组列出变体，同名需求额外标注需求ID */
  const requirementOptions = computed(() =>
    (requirementsStore.document?.requirements ?? []).map((requirement) => ({
      requirement_name: requirement.name,
      requirement_id: requirement.id,
      duplicate: (requirementsByName.value.get(requirement.name)?.length ?? 0) > 1,
      variants: requirement.variants.map((variant, index) => ({
        variant_key: variant.key,
        label: refLabel(variant.key, index),
        vehicles: variant.vehicles,
      })),
    })),
  )

  /** 从盘上读一份并覆盖当前状态，读取失败由调用方决定怎么提示 */
  async function readFromDisk() {
    const api = window.desktop?.configs
    if (!api?.load) return
    const outcome = await api.load()
    document.value = outcome.document ?? null
    if (outcome.error) error.value = outcome.error
  }

  async function load() {
    // 浏览器里跑（npm run preview）没有主进程，保持空状态
    if (!window.desktop?.configs?.load) {
      loaded.value = true
      return
    }

    loading.value = true
    error.value = ''
    try {
      await readFromDisk()
    } catch {
      document.value = null
      error.value = '读取已保存的配置参数失败'
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  /** 切换 / 解绑项目时清空，避免把上一个项目的数据当当前项目的 */
  function clear() {
    document.value = null
    error.value = ''
    loaded.value = false
  }

  async function persist(next: Configuration[]): Promise<SaveResult> {
    const api = window.desktop?.configs
    if (!api?.save) return { ok: false, error: '配置参数只在桌面端可保存' }

    saving.value = true
    try {
      // IPC 用结构化克隆传参，Vue 响应式代理不能被克隆；同时这也正好是落盘的 JSON 形态
      const payload = JSON.parse(JSON.stringify(next)) as Configuration[]
      const outcome = await api.save(payload)
      if (!outcome.saved) {
        const message = outcome.error ?? '保存配置参数失败'
        error.value = message
        return { ok: false, error: message }
      }
      // 以盘上的数据为准：主进程会 trim 名称、去重车型
      await readFromDisk()
      return { ok: true }
    } catch {
      const message = '保存配置参数失败'
      error.value = message
      return { ok: false, error: message }
    } finally {
      saving.value = false
    }
  }

  function missingConfiguration(configKey: string): SaveResult {
    return { ok: false, error: `配置项「${configKey}」不存在` }
  }

  async function addConfiguration(configKey: string): Promise<SaveResult> {
    const name = configKey.trim()
    if (!name) return { ok: false, error: '配置项名称不能为空' }
    if (configurations.value.some((item) => item.config_key === name)) {
      return { ok: false, error: `配置项「${name}」已存在` }
    }
    return persist([...configurations.value, { config_key: name, config_value: [] }])
  }

  async function renameConfiguration(from: string, to: string): Promise<SaveResult> {
    const name = to.trim()
    if (!name) return { ok: false, error: '配置项名称不能为空' }
    if (!configurations.value.some((item) => item.config_key === from)) {
      return missingConfiguration(from)
    }
    if (name === from) return { ok: true }
    if (configurations.value.some((item) => item.config_key === name)) {
      return { ok: false, error: `配置项「${name}」已存在` }
    }

    return persist(
      configurations.value.map((item) =>
        item.config_key === from
          ? {
              config_key: name,
              config_value: item.config_value.map((value) => ({ ...value, config_key: name })),
            }
          : item,
      ),
    )
  }

  async function removeConfiguration(configKey: string): Promise<SaveResult> {
    if (!configurations.value.some((item) => item.config_key === configKey)) {
      return missingConfiguration(configKey)
    }
    return persist(configurations.value.filter((item) => item.config_key !== configKey))
  }

  async function addConfigValue(configKey: string, input: ConfigValueInput): Promise<SaveResult> {
    const configuration = configurations.value.find((item) => item.config_key === configKey)
    if (!configuration) return missingConfiguration(configKey)

    const text = input.value.trim()
    if (!text) return { ok: false, error: '配置值不能为空' }
    if (configuration.config_value.some((value) => value.value === text)) {
      return { ok: false, error: `配置值「${text}」已存在` }
    }

    return persist(
      configurations.value.map((item) =>
        item.config_key === configKey
          ? {
              ...item,
              config_value: [
                ...item.config_value,
                {
                  config_key: configKey,
                  value: text,
                  relay_variants: input.relay_variants,
                  special_vehicles: input.special_vehicles,
                },
              ],
            }
          : item,
      ),
    )
  }

  async function updateConfigValue(
    configKey: string,
    originalValue: string,
    input: ConfigValueInput,
  ): Promise<SaveResult> {
    const configuration = configurations.value.find((item) => item.config_key === configKey)
    if (!configuration) return missingConfiguration(configKey)

    const index = configuration.config_value.findIndex((value) => value.value === originalValue)
    if (index < 0) return { ok: false, error: `配置值「${originalValue}」不存在` }

    const text = input.value.trim()
    if (!text) return { ok: false, error: '配置值不能为空' }
    if (
      text !== originalValue &&
      configuration.config_value.some((value) => value.value === text)
    ) {
      return { ok: false, error: `配置值「${text}」已存在` }
    }

    const nextValue = {
      config_key: configKey,
      value: text,
      relay_variants: input.relay_variants,
      special_vehicles: input.special_vehicles,
    }
    return persist(
      configurations.value.map((item) =>
        item.config_key === configKey
          ? {
              ...item,
              config_value: item.config_value.map((value, valueIndex) =>
                valueIndex === index ? nextValue : value,
              ),
            }
          : item,
      ),
    )
  }

  async function removeConfigValue(configKey: string, value: string): Promise<SaveResult> {
    const configuration = configurations.value.find((item) => item.config_key === configKey)
    if (!configuration) return missingConfiguration(configKey)
    if (!configuration.config_value.some((item) => item.value === value)) {
      return { ok: false, error: `配置值「${value}」不存在` }
    }

    return persist(
      configurations.value.map((item) =>
        item.config_key === configKey
          ? { ...item, config_value: item.config_value.filter((entry) => entry.value !== value) }
          : item,
      ),
    )
  }

  /** 从配置值里去掉一条变体引用（配置值本身保留） */
  async function removeRelayVariant(
    configKey: string,
    value: string,
    requirementName: string,
    variantKey: string,
  ): Promise<SaveResult> {
    const configuration = configurations.value.find((item) => item.config_key === configKey)
    if (!configuration) return missingConfiguration(configKey)
    const target = configuration.config_value.find((item) => item.value === value)
    if (!target) return { ok: false, error: `配置值「${value}」不存在` }
    if (
      !target.relay_variants.some(
        (ref) => ref.requirement_name === requirementName && ref.variant_key === variantKey,
      )
    ) {
      return { ok: false, error: '该关联变体不存在' }
    }

    return persist(
      configurations.value.map((item) =>
        item.config_key === configKey
          ? {
              ...item,
              config_value: item.config_value.map((entry) =>
                entry.value === value
                  ? {
                      ...entry,
                      relay_variants: entry.relay_variants.filter(
                        (ref) =>
                          !(
                            ref.requirement_name === requirementName &&
                            ref.variant_key === variantKey
                          ),
                      ),
                    }
                  : entry,
              ),
            }
          : item,
      ),
    )
  }

  return {
    document,
    loading,
    saving,
    error,
    loaded,
    configurations,
    hasData,
    configurationCount,
    configValueCount,
    vehicleCount,
    vehicleOptions,
    requirementOptions,
    rows,
    load,
    clear,
    addConfiguration,
    renameConfiguration,
    removeConfiguration,
    addConfigValue,
    updateConfigValue,
    removeConfigValue,
    removeRelayVariant,
  }
})
