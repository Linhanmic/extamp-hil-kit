<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DEFAULT_PROJECT_SETTINGS } from '@/config/settings-defaults'
import SettingsPathField from '@/components/SettingsPathField.vue'
import ThemeSwitcher from '@/components/ThemeSwitcher.vue'
import { toProjectRelativePath } from '@/composables/project-path'
import { useWorkspace } from '@/composables/useWorkspace'
import { useSettingsStore } from '@/stores/settings'
import type { ProjectSettings, SettingsPickKind } from '@/models'

/**
 * 项目设置：各业务数据的位置 + 需求分析表的导入默认参数。
 * 保存后主进程整份写回 settings.json，需求与配置参数按新路径重读。
 */
const visible = defineModel<boolean>({ default: false })
const store = useSettingsStore()
const { project } = useWorkspace()

const form = ref<ProjectSettings>(clone(DEFAULT_PROJECT_SETTINGS))
const error = ref('')

function clone(settings: ProjectSettings): ProjectSettings {
  return JSON.parse(JSON.stringify(settings)) as ProjectSettings
}

function useRelativePaths(settings: ProjectSettings) {
  const base = project.value?.path ?? ''
  for (const key of [
    'requirementsPath',
    'configsPath',
    'outputPath',
    'snapshotPath',
    'volumeTablePath',
    'slotMappingPath',
    'conceptOutputPath',
    'slotConceptOutputPath',
  ] as const) {
    settings[key] = toProjectRelativePath(base, settings[key])
  }
  settings.requirementsImport.filePath = toProjectRelativePath(
    base,
    settings.requirementsImport.filePath,
  )
  return settings
}

watch(visible, (open) => {
  if (!open) return
  form.value = useRelativePaths(clone(store.settings))
  error.value = ''
})

const available = computed(() => Boolean(window.desktop?.settings))

const COLUMN_PATTERN = /^[A-Za-z]{1,3}$/

async function chooseFile(kind: SettingsPickKind) {
  const outcome = await store.pickFile(kind)
  if (outcome.canceled) return
  if (outcome.error || !outcome.path) {
    error.value = outcome.error ?? '选择文件失败'
    return
  }

  const path = toProjectRelativePath(project.value?.path ?? '', outcome.path)
  switch (kind) {
    case 'requirements-json':
      form.value.requirementsPath = path
      break
    case 'configs-json':
      form.value.configsPath = path
      break
    case 'output-file':
      form.value.outputPath = path
      break
    case 'volume-table':
      form.value.volumeTablePath = path
      break
    case 'slot-mapping':
      form.value.slotMappingPath = path
      break
    case 'snapshot-file':
      form.value.snapshotPath = path
      break
    case 'concept-output-file':
      form.value.conceptOutputPath = path
      break
    case 'slot-concept-output-file':
      form.value.slotConceptOutputPath = path
      break
    case 'requirements-sheet':
      form.value.requirementsImport.filePath = path
      break
  }
}

async function chooseDirectory() {
  const outcome = await store.pickDirectory()
  if (outcome.canceled) return
  if (outcome.error || !outcome.path) {
    error.value = outcome.error ?? '选择目录失败'
    return
  }
  form.value.slotMappingPath = toProjectRelativePath(project.value?.path ?? '', outcome.path)
}

function validate(): string {
  const importSettings = form.value.requirementsImport
  if (!Number.isInteger(importSettings.headerRow) || importSettings.headerRow < 0) {
    return '表头行必须是不小于 0 的整数（0 表示自动探测）'
  }

  const columns: [string, string][] = [
    ['需求ID列', importSettings.idCol],
    ['需求名称列', importSettings.nameCol],
    ['需求详情列', importSettings.detailCol],
    ['车型起始列', importSettings.vehicleStartCol],
  ]
  for (const [label, value] of columns) {
    const text = value.trim()
    if (text && !COLUMN_PATTERN.test(text)) {
      return `${label}只能填 1–3 个字母的列号，如 A、AE`
    }
  }
  return ''
}

async function submit() {
  error.value = validate()
  if (error.value) return

  form.value = useRelativePaths(form.value)
  const result = await store.save(form.value)
  if (!result.ok) {
    error.value = result.error
    return
  }
  visible.value = false
}
</script>

<!-- @grid A：弹窗内容按分组堆叠，每组是卡片内的 Row（标签 3 · 输入 7 · 按钮 2） -->
<template>
  <el-dialog v-model="visible" title="项目设置" width="720px" destroy-on-close>
    <!-- 三组设置叠起来比最小窗口还高，内容自己滚动，弹窗保持居中 -->
    <div class="flex max-h-[64vh] flex-col gap-3 overflow-y-auto pr-1">
      <el-alert
        v-if="!available"
        type="info"
        :closable="false"
        title="设置只在桌面端可保存"
        description="读写项目目录需要 Electron 主进程，请通过 npm run dev 或安装包启动。"
      />

      <el-alert v-if="store.error" type="warning" :closable="false" show-icon :title="store.error" />

      <!-- 外观：应用级偏好，即点即生效，不写进项目设置文件 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <p class="text-[11px] font-medium text-ink">外观</p>
        <p class="mt-1 mb-2 text-[11px] text-ink-muted">
          界面主题跟随系统、浅色或深色；存在本机，切换后立即生效，与当前项目无关。
        </p>
        <!-- @grid A：标签 3 · 控件 9，与下面各组的行对齐一致 -->
        <div class="grid grid-cols-12 items-center gap-2">
          <span class="col-span-3 text-[11px] text-ink-muted">主题</span>
          <div class="col-span-9">
            <ThemeSwitcher />
          </div>
        </div>
      </div>

      <!-- Gauge 运行 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <p class="text-[11px] font-medium text-ink">Gauge 运行</p>
        <p class="mt-1 mb-2 text-[11px] text-ink-muted">
          可执行文件留空时使用 PATH 中的 gauge；环境名用于写入 env/&lt;环境&gt;/value.properties 的 vehicle_model；附加参数插入 gauge run 与规格书路径之间。
        </p>
        <!-- @grid A：标签 3 · 控件 9 -->
        <div class="grid grid-cols-12 items-center gap-2">
          <span class="col-span-3 text-[11px] text-ink-muted">可执行文件</span>
          <div class="col-span-9">
            <el-input
              v-model="form.gaugeExecutable"
              size="small"
              placeholder="gauge / gauge.exe 或绝对路径"
            />
          </div>
          <span class="col-span-3 text-[11px] text-ink-muted">环境名</span>
          <div class="col-span-9">
            <el-input v-model="form.gaugeEnv" size="small" placeholder="default" />
          </div>
          <span class="col-span-3 text-[11px] text-ink-muted">附加参数</span>
          <div class="col-span-9">
            <el-input
              v-model="form.gaugeArgs"
              size="small"
              placeholder="如 --verbose"
            />
          </div>
        </div>
      </div>

      <!-- 数据文件 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <p class="text-[11px] font-medium text-ink">数据文件</p>
        <p class="mt-1 mb-2 text-[11px] text-ink-muted">
          需求与配置参数的 json 位置；留空沿用 <code class="text-ink">.hil-kit</code>
          下的默认文件。相对路径按项目根解析。
        </p>
        <div class="flex flex-col gap-2">
          <SettingsPathField
            v-model="form.requirementsPath"
            label="需求 JSON"
            placeholder="留空用 .hil-kit/requirements.json"
            fallback=".hil-kit/requirements.json"
            @pick="chooseFile('requirements-json')"
          />
          <SettingsPathField
            v-model="form.configsPath"
            label="配置参数 JSON"
            placeholder="留空用 .hil-kit/config.json"
            fallback=".hil-kit/config.json"
            @pick="chooseFile('configs-json')"
          />
        </div>
      </div>

      <!-- 其他业务数据 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <p class="text-[11px] font-medium text-ink">其他业务数据</p>
        <p class="mt-1 mb-2 text-[11px] text-ink-muted">
          供出声位置、扬声器快照、音量表与 SLOT 映射使用；两类目标 CPT 承载生成结果，上层 spec 通过统一概念名替换内部实现来适配车型。
        </p>
        <div class="flex flex-col gap-2">
          <SettingsPathField
            v-model="form.outputPath"
            label="出声位置文件"
            placeholder="如 config/出声位置/出声位置.txt"
            @pick="chooseFile('output-file')"
          />
          <SettingsPathField
            v-model="form.snapshotPath"
            label="扬声器快照文件"
            placeholder="如 config/扬声器快照/snapshot.ini"
            @pick="chooseFile('snapshot-file')"
          />
          <SettingsPathField
            v-model="form.volumeTablePath"
            label="音量表文件"
            placeholder="如 config/音量表/test.csv"
            @pick="chooseFile('volume-table')"
          />
          <SettingsPathField
            v-model="form.slotMappingPath"
            label="SLOT 映射目录"
            placeholder="如 config/SLOT映射"
            @pick="chooseDirectory"
          />
          <SettingsPathField
            v-model="form.conceptOutputPath"
            label="出声位置目标CPT文件"
            placeholder="如 ./specs/出声位置.cpt"
            @pick="chooseFile('concept-output-file')"
          />
          <SettingsPathField
            v-model="form.slotConceptOutputPath"
            label="SLOT映射目标CPT文件"
            placeholder="如 ./specs/SLOT映射.cpt"
            @pick="chooseFile('slot-concept-output-file')"
          />
        </div>
      </div>

      <!-- 需求分析表导入 -->
      <div class="rounded-lg border border-line bg-surface-soft p-3">
        <p class="text-[11px] font-medium text-ink">需求分析表导入</p>
        <p class="mt-1 mb-2 text-[11px] text-ink-muted">
          导入时文件选择器从这里开始，工作表与列映射作为默认值；留空或填 0 表示按表自动探测。
        </p>
        <div class="flex flex-col gap-2">
          <SettingsPathField
            v-model="form.requirementsImport.filePath"
            label="需求分析表"
            placeholder="留空则每次自己选"
            @pick="chooseFile('requirements-sheet')"
          />

          <!-- @grid A：工作表名 3 + 表头行 4 + 留空 5 -->
          <div class="grid grid-cols-12 items-center gap-2">
            <label class="col-span-3 text-[11px] text-ink-muted">工作表名</label>
            <div class="col-span-4">
              <el-input
                v-model="form.requirementsImport.sheetName"
                size="small"
                placeholder="留空自动挑含「需求」的表"
              />
            </div>
            <label class="col-span-2 text-[11px] text-ink-muted">表头行（1 起）</label>
            <div class="col-span-3">
              <el-input-number
                v-model="form.requirementsImport.headerRow"
                size="small"
                :min="0"
                :max="200"
                controls-position="right"
                class="w-full"
              />
            </div>
          </div>

          <!-- @grid A：四个列位置两两一行 -->
          <div class="grid grid-cols-12 items-center gap-2">
            <label class="col-span-3 text-[11px] text-ink-muted">需求ID列</label>
            <div class="col-span-3">
              <el-input
                v-model="form.requirementsImport.idCol"
                size="small"
                maxlength="3"
                placeholder="A"
              />
            </div>
            <label class="col-span-3 text-[11px] text-ink-muted">需求名称列</label>
            <div class="col-span-3">
              <el-input
                v-model="form.requirementsImport.nameCol"
                size="small"
                maxlength="3"
                placeholder="B"
              />
            </div>

            <label class="col-span-3 text-[11px] text-ink-muted">需求详情列</label>
            <div class="col-span-3">
              <el-input
                v-model="form.requirementsImport.detailCol"
                size="small"
                maxlength="3"
                placeholder="E"
              />
            </div>
            <label class="col-span-3 text-[11px] text-ink-muted">车型起始列</label>
            <div class="col-span-3">
              <el-input
                v-model="form.requirementsImport.vehicleStartCol"
                size="small"
                maxlength="3"
                placeholder="G"
              />
            </div>
          </div>
        </div>
      </div>

      <el-alert v-if="error" type="error" :closable="false" show-icon :title="error" />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="store.saving" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>
