<script lang="ts">
/** 目标文件：已有文件传绝对 path，新文件传相对名 */
export interface ConceptTarget {
  path: string
  name: string
}
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useConceptsStore } from '@/stores/concepts'
import type { Concept, ConceptStep, ConceptTable } from '@/spec/concept-file'
import { extractParams, validateConcepts } from '@/spec/concept-file'

/**
 * 封装表单：结构化编辑一个封装（标题 + 步骤 + 可选数据表）。
 * 编辑模式目标文件固定；新建模式可在已有文件与新文件之间选择。
 * 保存时把该封装合并进目标文件的封装列表，由 store 整份写回 .cpt。
 */
const props = defineProps<{
  /** 编辑模式的目标文件（固定）；新建模式传 null，由对话框内选择 */
  fixedTarget: ConceptTarget | null
  /** 编辑模式：该文件现有的全部封装，保存时按 conceptIndex 替换 */
  fileConcepts: Concept[]
  /** 编辑时的下标；新建传 -1 */
  conceptIndex: number
}>()

const visible = defineModel<boolean>({ default: false })
const store = useConceptsStore()

interface StepForm {
  text: string
  hasTable: boolean
  headers: string[]
  rows: string[][]
}

const heading = ref('')
const steps = ref<StepForm[]>([])
const saving = ref(false)
const error = ref('')

// 新建模式的目标选择：默认放进第一个已有文件；没有文件就新建 user.cpt
const targetMode = ref<'existing' | 'new'>('existing')
const targetExistingPath = ref('')
const targetNewName = ref('user.cpt')

const isEdit = computed(() => props.conceptIndex >= 0)
const title = computed(() => (isEdit.value ? '编辑封装' : '新建封装'))

/** 最终保存目标 */
const target = computed<ConceptTarget>(() => {
  if (props.fixedTarget) return props.fixedTarget
  if (targetMode.value === 'existing') {
    const file = store.files.find((item) => item.path === targetExistingPath.value)
    return file ? { path: file.path, name: file.name } : { path: '', name: '' }
  }
  const name = targetNewName.value.trim()
  return { path: name, name }
})

/** 目标文件里现有的封装（编辑模式取 props，新建取选中文件） */
const targetConcepts = computed<Concept[]>(() => {
  if (isEdit.value) return props.fileConcepts
  return store.files.find((item) => item.path === target.value.path)?.concepts ?? []
})

/** 标题里的动态参数（实时派生，只读展示） */
const headingParams = computed(() => extractParams(heading.value))

/** 当前草稿转成结构化封装 */
function toConcept(): Concept {
  return {
    heading: heading.value.trim(),
    params: extractParams(heading.value),
    steps: steps.value.map(
      (step): ConceptStep => ({
        text: step.text.trim(),
        table: step.hasTable
          ? {
              headers: step.headers.map((cell) => cell.trim()),
              rows: step.rows.map((row) => row.map((cell) => cell.trim())),
            }
          : null,
      }),
    ),
  }
}

function tableToForm(table: ConceptTable | null): Pick<StepForm, 'hasTable' | 'headers' | 'rows'> {
  if (!table) return { hasTable: false, headers: ['', ''], rows: [['', '']] }
  return {
    hasTable: true,
    headers: table.headers.length ? [...table.headers] : [''],
    rows: table.rows.length ? table.rows.map((row) => [...row]) : [table.headers.map(() => '')],
  }
}

function conceptToForm(concept: Concept | null): { heading: string; steps: StepForm[] } {
  if (!concept) {
    return {
      heading: '新封装 <参数>',
      steps: [{ text: '第一步', hasTable: false, headers: ['', ''], rows: [['', '']] }],
    }
  }
  return {
    heading: concept.heading,
    steps: concept.steps.map((step) => ({ text: step.text, ...tableToForm(step.table) })),
  }
}

watch(visible, (open) => {
  if (!open) return
  const draft = conceptToForm(props.conceptIndex >= 0 ? (props.fileConcepts[props.conceptIndex] ?? null) : null)
  heading.value = draft.heading
  steps.value = draft.steps
  error.value = ''
  targetMode.value = store.files.length ? 'existing' : 'new'
  targetExistingPath.value = store.files[0]?.path ?? ''
  targetNewName.value = 'user.cpt'
})

function addStep() {
  steps.value = [
    ...steps.value,
    { text: '', hasTable: false, headers: ['', ''], rows: [['', '']] },
  ]
}

function removeStep(index: number) {
  steps.value = steps.value.filter((_, i) => i !== index)
}

function moveStep(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= steps.value.length) return
  const next = [...steps.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  steps.value = next
}

/** 表格列数变化时同步每行单元格数量 */
function syncRowWidth(step: StepForm) {
  const width = step.headers.length
  step.rows = step.rows.map((row) => {
    if (row.length === width) return row
    if (row.length > width) return row.slice(0, width)
    return [...row, ...Array.from({ length: width - row.length }, () => '')]
  })
}

function addColumn(step: StepForm) {
  step.headers.push('')
  syncRowWidth(step)
}

function removeColumn(step: StepForm, index: number) {
  if (step.headers.length <= 1) return
  step.headers.splice(index, 1)
  syncRowWidth(step)
}

function addRow(step: StepForm) {
  step.rows.push(step.headers.map(() => ''))
}

function removeRow(step: StepForm, index: number) {
  step.rows.splice(index, 1)
}

async function save() {
  error.value = ''
  const concept = toConcept()
  const issues = validateConcepts([concept]).filter((issue) => issue.message !== '文件至少需要一个封装')
  if (issues.length) {
    error.value = issues.map((issue) => issue.message).join('；')
    return
  }

  const dest = target.value
  if (!dest.path) {
    error.value = '请选择或填写目标文件'
    return
  }
  if (!isEdit.value && targetMode.value === 'new' && !/\.cpt$/i.test(dest.name)) {
    error.value = '封装文件名需要以 .cpt 结尾'
    return
  }

  const next = [...targetConcepts.value]
  if (isEdit.value) next[props.conceptIndex] = concept
  else next.push(concept)

  saving.value = true
  const result = await store.saveConcepts(dest.path, next)
  saving.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  ElMessage.success(isEdit.value ? '封装已更新' : '封装已创建')
  visible.value = false
}
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="720px" top="6vh" destroy-on-close>
    <div class="flex flex-col gap-3">
      <!-- 目标文件：编辑时固定，新建时可选已有文件或输入新文件名 -->
      <div v-if="isEdit" class="text-[11px] text-ink-muted">
        目标文件：<span class="text-ink">{{ fixedTarget?.name }}</span>
        · 保存时会按当前列表重新生成整个 .cpt 文件
      </div>
      <div v-else class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-ink-muted">目标文件</span>
        <el-radio-group v-model="targetMode" size="small">
          <el-radio-button value="existing" :disabled="!store.files.length">已有文件</el-radio-button>
          <el-radio-button value="new">新文件</el-radio-button>
        </el-radio-group>
        <el-select
          v-if="targetMode === 'existing'"
          v-model="targetExistingPath"
          size="small"
          class="w-52"
        >
          <el-option
            v-for="file in store.files"
            :key="file.path"
            :label="file.name"
            :value="file.path"
          />
        </el-select>
        <el-input
          v-else
          v-model="targetNewName"
          size="small"
          class="w-52"
          placeholder="如 user.cpt"
        />
        <span class="text-[11px] text-ink-muted">保存时会重新生成整个 .cpt 文件</span>
      </div>

      <!-- 封装标题 -->
      <div>
        <div class="mb-1 flex items-center justify-between">
          <span class="text-xs text-ink-muted">封装标题</span>
          <div class="flex flex-wrap items-center gap-1">
            <span class="text-[11px] text-ink-muted">参数：</span>
            <el-tag v-for="param in headingParams" :key="param" size="small" effect="plain">
              {{ param }}
            </el-tag>
            <span v-if="!headingParams.length" class="text-[11px] text-ink-muted">（无）</span>
          </div>
        </div>
        <el-input
          v-model="heading"
          placeholder="例如：创建用户 <用户ID> <用户名>（参数写在 <> 里）"
        />
      </div>

      <!-- 步骤列表 -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <span class="text-xs text-ink-muted">步骤（至少一步）</span>
          <el-button size="small" text type="primary" @click="addStep">+ 添加步骤</el-button>
        </div>

        <div
          v-for="(step, index) in steps"
          :key="index"
          class="rounded-lg border border-line bg-surface p-2"
        >
          <div class="flex items-start gap-2">
            <span class="mt-2 w-6 shrink-0 text-center text-[11px] text-ink-muted">{{ index + 1 }}</span>
            <el-input
              v-model="step.text"
              class="min-w-0 flex-1"
              placeholder="步骤原文，例如：分配编号 <用户ID>"
            />
            <div class="flex shrink-0 items-center gap-1">
              <el-button size="small" text :disabled="index === 0" @click="moveStep(index, -1)">
                ↑
              </el-button>
              <el-button
                size="small"
                text
                :disabled="index === steps.length - 1"
                @click="moveStep(index, 1)"
              >
                ↓
              </el-button>
              <el-button
                size="small"
                text
                type="danger"
                :disabled="steps.length <= 1"
                @click="removeStep(index)"
              >
                删除
              </el-button>
            </div>
          </div>

          <!-- 内联数据表 -->
          <div class="mt-2 pl-8">
            <el-checkbox v-model="step.hasTable">带数据表</el-checkbox>
            <div v-if="step.hasTable" class="mt-2 flex flex-col gap-2">
              <div class="flex flex-wrap items-center gap-1">
                <span class="w-12 shrink-0 text-[11px] text-ink-muted">表头</span>
                <el-input
                  v-for="(_, hIndex) in step.headers"
                  :key="hIndex"
                  v-model="step.headers[hIndex]"
                  class="w-24"
                  size="small"
                  :placeholder="`列${hIndex + 1}`"
                />
                <el-button size="small" text type="primary" @click="addColumn(step)">+ 列</el-button>
                <el-button
                  size="small"
                  text
                  type="danger"
                  :disabled="step.headers.length <= 1"
                  @click="removeColumn(step, step.headers.length - 1)"
                >
                  - 列
                </el-button>
              </div>
              <div
                v-for="(row, rIndex) in step.rows"
                :key="rIndex"
                class="flex flex-wrap items-center gap-1"
              >
                <span class="w-12 shrink-0 text-[11px] text-ink-muted">行{{ rIndex + 1 }}</span>
                <el-input
                  v-for="(_, cIndex) in row"
                  :key="cIndex"
                  v-model="row[cIndex]"
                  class="w-24"
                  size="small"
                />
                <el-button size="small" text type="danger" @click="removeRow(step, rIndex)">
                  删行
                </el-button>
              </div>
              <el-button size="small" text type="primary" class="self-start" @click="addRow(step)">
                + 加行
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <el-alert v-if="error" type="error" show-icon :closable="false" :title="error" />
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving || store.saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>
