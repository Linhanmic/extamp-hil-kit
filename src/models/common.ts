
/** 需求对应变体 */
export interface Variant {
  requirement_id: string// 变体所属需求ID
  key: string// 变体内容键，由变体内容去除所有控制字符、空白字符、标点符号生成，用于处理多个变体内容除了控制字符内容其实一样的问题，减少变体数量
  content: string[]// 关联的所有原始变体描述
  vehicles: string[]// 变体适用的车型
}
/** 需求 */
export interface Requirement {
  id: string//需求ID
  name: string//需求名称
  detail: string//需求详情
  variants: Variant[]//需求对应的所有变体
}
/** 配置值关联的需求变体引用：需求按名称匹配、变体按内容键匹配，变体内容与车型以需求数据为准 */
export interface VariantRef {
  requirement_name: string//关联需求名称，对应需求数据里 requirements[].name
  variant_key: string//关联变体的内容键，空串表示该需求「无变体差异」的那一支
}
/** 特殊车型配置的匹配方式 */
export type SpecialVehicleMatch = 'starts_with' | 'contains'
/** 特殊车型配置规则：以指定前缀开头，或名称包含指定关键字 */
export interface SpecialVehicleRule {
  match: SpecialVehicleMatch
  text: string
}
/** 配置值 */
export interface ConfigValue {
  config_key: string//配置值所属配置键，便于在内存与界面里定位所属配置项；落盘时不写，读取时按所属配置项补齐
  value: string//配置值
  relay_variants: VariantRef[]//配置值关联的需求变体引用，通过它们得到配置值对应的车型，部分特殊配置此项为空
  /** 特殊车型配置规则（前缀 / 包含）；生效车型由读取方按规则匹配并合并关联变体车型 */
  special_vehicles: SpecialVehicleRule[]
}
/** 配置 */
export interface Configuration {
  config_key: string//配置键
  config_value: ConfigValue[]//配置包含的所有配置值
}
/** config.json 的文件结构：结构约定见 docs/config-json.md */
export interface ConfigsDocument {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  configurations: Configuration[]
}
/** 读取已落盘配置数据的结果 */
export interface ConfigsLoadOutcome {
  error?: string//文件存在但结构/版本不可用，需要重新维护
  empty?: boolean//该项目还没有配置参数
  document?: ConfigsDocument
}
/** 一次保存落盘后的摘要 */
export interface ConfigsSavedState {
  filePath: string//落盘的数据文件绝对路径
  createdAt: string//首次保存时间（ISO 8601 UTC），后续保存不变
  updatedAt: string//最近一次保存时间（ISO 8601 UTC）
  configurationCount: number
  configValueCount: number
}
/** 保存落盘结果 */
export interface ConfigsSaveOutcome {
  error?: string
  saved?: ConfigsSavedState
}
/** 需求分析表导入的默认参数：空串 / 0 表示导入时自动探测或每次选择 */
export interface RequirementsImportDefaults {
  filePath: string//需求分析表默认路径，空表示每次选择
  sheetName: string//默认工作表名，空表示优先挑名字含「需求」的表
  headerRow: number//表头行号，0 表示自动探测
  idCol: string//需求ID列（Excel 列字母），空表示自动探测
  nameCol: string//需求名称列
  detailCol: string//需求详情列
  vehicleStartCol: string//车型起始列
}
/** 项目设置：各业务数据的位置 + 需求导入默认参数；路径可相对项目根或绝对路径，空表示用默认值 */
export interface ProjectSettings {
  requirementsPath: string//需求 json
  configsPath: string//配置参数 json
  outputPath: string//出声位置文件
  snapshotDir: string//扬声器快照所在目录
  volumeTablePath: string//音量表文件
  slotMappingPath: string//SLOT 映射配置文件
  requirementsImport: RequirementsImportDefaults
}
/** settings.json 的文件结构：结构约定见 docs/settings-json.md */
export interface ProjectSettingsDocument {
  schemaVersion: number
  updatedAt: string
  settings: ProjectSettings
}
/** 读取设置的结果：文件不可用时仍会带回默认值，error 只用于提示 */
export interface SettingsLoadOutcome {
  error?: string
  document?: ProjectSettingsDocument
}
/** 保存设置后的摘要 */
export interface SettingsSavedState {
  filePath: string//落盘绝对路径
  updatedAt: string//ISO 8601 UTC
}
/** 保存设置的结果 */
export interface SettingsSaveOutcome {
  error?: string
  saved?: SettingsSavedState
}
/** 选择文件 / 目录的结果：取消或失败都通过字段回传 */
export interface SettingsPickOutcome {
  canceled?: boolean
  error?: string
  path?: string
}
/** 设置页里可以挑文件的几类目标，主进程据此决定标题与文件过滤 */
export type SettingsPickKind =
  | 'requirements-json'
  | 'configs-json'
  | 'output-file'
  | 'volume-table'
  | 'slot-mapping'
  | 'requirements-sheet'
/** 需求表的列位置配置（不含文件位置），表头探测后可在导入界面确认与调整 */
export interface RequirementsColumnMapping {
  headerRow: number// 表头所在行号
  idCol: string | number// 需求ID列号
  nameCol: string | number// 需求名称列号
  detailCol: string | number// 需求详情列号
  vehicleStartCol: string | number//车型起始列号
}
/** 需求导入配置 */
export interface RequirementsParseConfig extends RequirementsColumnMapping {
  filePath: string// 需求分析表文件路径
  sheetName: string// 需求所在工作表名称
}
/** 需求表某一列在数据区的探测结果，供导入界面核对列配置 */
export interface RequirementSheetColumn {
  index: number// 列号（1 基）
  letter: string// Excel 列字母，如 A、AE
  header: string// 表头文本，空串表示该列没有表头
  isPlatform: boolean// 表头含「平台」的列：解析时整列忽略，不进车型清单
  applicableCells: number// 数据区里以「●」开头的单元格数
  notApplicableCells: number// 数据区里「—」的单元格数
  textCells: number// 数据区里没有「●」标记的非空单元格数（功能安全这类列就靠它区分）
}
/** 需求表探测结果：导入界面用它预填列配置 */
export interface RequirementSheetProbe {
  sheetName: string
  rowCount: number// 工作表总行数
  headerRow: number// 识别出的表头行号
  mapping: RequirementsColumnMapping// 建议的列配置
  columns: RequirementSheetColumn[]// 探测区间内的列，按列号顺序
  notes: string[]// 探测过程中的提示（如某列是兜底推断的）
}
/** 需求表解析告警：不阻断导入，逐条列给用户确认 */
export interface RequirementsParseWarning {
  row: number// 出问题的行号（1 基），0 表示整表级
  message: string
}
/** 需求表解析统计 */
export interface RequirementsParseStats {
  dataRows: number// 表头之后被读取的数据行数
  blankRows: number// 整行空白的行数
  skippedRows: number// 缺需求ID被跳过的行数
  mergedRows: number// 需求ID重复、合并进已有需求的行数
  requirementCount: number
  variantCount: number
  vehicleCount: number// 生效的车型列数
  applicableCells: number
  notApplicableCells: number
  textCells: number// 不带「●」标记、按变体描述处理的单元格数
}
/** 需求表解析结果 */
export interface RequirementsParseResult {
  vehicles: string[]// 车型列名，按列顺序
  requirements: Requirement[]
  stats: RequirementsParseStats
  warnings: RequirementsParseWarning[]
}
/** 选中需求分析表后的文件信息 */
export interface RequirementsFileInfo {
  filePath: string
  sheets: string[]
}
/** 一次导入落盘后的摘要 */
export interface RequirementsSavedState {
  filePath: string// 落盘的数据文件绝对路径
  createdAt: string// 首次导入时间（ISO 8601 UTC），后续每次导入保持不变
  updatedAt: string// 最近一次导入时间（ISO 8601 UTC）
  requirementCount: number
  variantCount: number
}
/** requirements.json 的文件结构：结构约定见 docs/requirements-json.md */
export interface RequirementsDocument {
  schemaVersion: number
  createdAt: string
  updatedAt: string
  requirements: Requirement[]
}
/** 读取已落盘需求数据的结果 */
export interface RequirementsLoadOutcome {
  error?: string// 文件存在但结构/版本不可用，需要重新导入
  empty?: boolean// 该项目还没有导入过需求
  document?: RequirementsDocument
}
/** 选择需求分析表的结果：取消或失败都通过字段回传，不向渲染层抛异常 */
export interface RequirementsChooseOutcome {
  canceled?: boolean
  error?: string
  file?: RequirementsFileInfo
}
/** 表头探测结果 */
export interface RequirementsProbeOutcome {
  error?: string
  probe?: RequirementSheetProbe
}
/** 解析预览结果 */
export interface RequirementsPreviewOutcome {
  error?: string
  result?: RequirementsParseResult
}
/** 导入落盘结果 */
export interface RequirementsSaveOutcome {
  error?: string
  saved?: RequirementsSavedState
}
