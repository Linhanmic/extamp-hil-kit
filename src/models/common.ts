
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
/** 配置值 */
export interface ConfigValue {
  config_key: string//配置值所属配置键
  value: string//配置值
  relay_variants: Variant[]//配置关联的变体，通过其可以更新配置值对应的车型，部分特殊配置此项为空
  vehicles: string[]//配置值适用的车型，可以通过关联变体计算，对于部分特殊配置值，在导入时直接填入
}
/** 配置 */
export interface Configuration {
  config_key: string//配置键
  config_value: ConfigValue[]//配置包含的所有配置值
}
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
  importedAt: string// 导入时间（ISO 8601 UTC）
  requirementCount: number
  variantCount: number
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
