/**
 * 数据模型模块入口（barrel）。
 *
 * 目前只有共享基础类型；业务模型（任务、SLOT 映射、出声位置、音量表、
 * 快照、配置参数、需求等）待数据建模确定后，每个领域一个文件在此补充导出，
 * 例如：
 *
 *   export type * from './task'
 *   export type * from './slot-map'
 *
 * 同时记得在主进程侧（electron/）用相对路径 `import type` 复用：
 * 主进程打包是独立构建，不识别 `@` 别名。
 */
export type {
  Variant,
  VariantRef,
  Requirement,
  SpecialVehicleMatch,
  SpecialVehicleRule,
  ConfigValue,
  Configuration,
  ConfigsDocument,
  ConfigsLoadOutcome,
  ConfigsSavedState,
  ConfigsSaveOutcome,
  RequirementsImportDefaults,
  ProjectSettings,
  ProjectSettingsDocument,
  SettingsLoadOutcome,
  SettingsSavedState,
  SettingsSaveOutcome,
  SettingsPickOutcome,
  SettingsPickKind,
  RequirementsColumnMapping,
  RequirementsParseConfig,
  RequirementSheetColumn,
  RequirementSheetProbe,
  RequirementsParseWarning,
  RequirementsParseStats,
  RequirementsParseResult,
  RequirementsFileInfo,
  RequirementsSavedState,
  RequirementsDocument,
  RequirementsLoadOutcome,
  RequirementsChooseOutcome,
  RequirementsProbeOutcome,
  RequirementsPreviewOutcome,
  RequirementsSaveOutcome
} from './common'
export type {
  OutputScenario,
  OutputDocument,
  OutputLoadOutcome,
} from './output'
export type {
  VolumeTableRow,
  VolumeTableDocument,
  VolumeTableLoadOutcome,
} from './volume'
export type {
  SlotMappingScenario,
  SlotMappingPlan,
  SlotMappingDocument,
  SlotMappingLoadOutcome,
} from './slot-map'
export type {
  SnapshotChannel,
  SnapshotFile,
  SnapshotDocument,
  SnapshotLoadOutcome,
} from './snapshot'
export type {
  SpecFileInfo,
  SpecFileContent,
  SpecsListOutcome,
  SpecsReadOutcome,
  SpecsSavedState,
  SpecsWriteOutcome,
} from './spec'
export type {
  ConceptFileInfo,
  ConceptFileContent,
  ConceptsListOutcome,
  ConceptsReadOutcome,
  ConceptsSavedState,
  ConceptsWriteOutcome,
  ConceptsDeleteOutcome,
  ConceptGenerateOutcome,
} from './concept'
