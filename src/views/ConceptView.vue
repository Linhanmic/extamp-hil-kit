<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useConceptsStore, type LoadedConceptFile } from '@/stores/concepts'
import type { Concept } from '@/spec/concept-file'
import ConceptFormDialog, { type ConceptTarget } from '@/components/ConceptFormDialog.vue'

/**
 * 封装管理：浏览 <项目>/concepts 下的 .cpt 封装文件，结构化增删改查。
 * 保存由对话框完成；本页负责列表、搜索、文件级与封装级删除。
 */
const store = useConceptsStore()
const keyword = ref('')

const dialogVisible = ref(false)
// 对话框入参：fixed=true 时锁定目标文件（编辑 / 向指定文件添加）；false 为新建模式由对话框选文件
const dialogFixed = ref(false)
const dialogTarget = ref<ConceptTarget>({ path: '', name: '' })
const dialogConcepts = ref<Concept[]>([])
const dialogIndex = ref(-1)

interface ConceptRow {
  file: LoadedConceptFile
  concept: Concept
  index: number
}

interface FileDisplay {
  file: LoadedConceptFile
  rows: ConceptRow[]
}

const displays = computed<FileDisplay[]>(() =>
  store.files.map((file) => ({
    file,
    rows: file.concepts.map((concept, index) => ({ file, concept, index })),
  })),
)

const filteredDisplays = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return displays.value
  return displays.value
    .map((display) => ({
      ...display,
      rows: display.rows.filter(
        (row) =>
          row.concept.heading.toLowerCase().includes(query) ||
          row.concept.steps.some((step) => step.text.toLowerCase().includes(query)),
      ),
    }))
    .filter((display) => display.rows.length || display.file.name.toLowerCase().includes(query))
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的封装' : '该项目还没有封装文件，点右上角「新建封装」开始',
)

function openCreate(target?: ConceptTarget) {
  // 新建模式：fixedTarget 传 null 时由对话框选择目标文件；传 target 则锁定该文件
  dialogFixed.value = Boolean(target)
  dialogTarget.value = target ?? { path: '', name: '' }
  dialogConcepts.value = []
  dialogIndex.value = -1
  dialogVisible.value = true
}

function openEdit(row: ConceptRow) {
  dialogFixed.value = true
  dialogTarget.value = { path: row.file.path, name: row.file.name }
  dialogConcepts.value = row.file.concepts
  dialogIndex.value = row.index
  dialogVisible.value = true
}

async function deleteConcept(row: ConceptRow) {
  const onlyOne = row.file.concepts.length === 1
  const message = onlyOne
    ? `文件「${row.file.name}」里只剩这一个封装，删除封装将同时删除整个文件，确定？`
    : `确定删除封装「${row.concept.heading}」？`
  try {
    await ElMessageBox.confirm(message, '删除封装', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  if (onlyOne) {
    const result = await store.deleteFile(row.file.path)
    if (result.ok) ElMessage.success('封装文件已删除')
    else ElMessage.error(result.error)
    return
  }

  const next = row.file.concepts.filter((_, index) => index !== row.index)
  const result = await store.saveConcepts(row.file.path, next)
  if (result.ok) ElMessage.success('封装已删除')
  else ElMessage.error(result.error)
}

async function deleteFile(file: LoadedConceptFile) {
  try {
    await ElMessageBox.confirm(
      `确定删除封装文件「${file.name}」及其中的 ${file.concepts.length} 个封装？`,
      '删除封装文件',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }
  const result = await store.deleteFile(file.path)
  if (result.ok) ElMessage.success('封装文件已删除')
  else ElMessage.error(result.error)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">封装管理</h1>
        <el-tag size="small" type="info" effect="plain">{{ store.fileCount }} 个文件</el-tag>
        <el-tag size="small" type="info" effect="plain">{{ store.conceptCount }} 个封装</el-tag>
        <el-tag v-if="store.issueCount" size="small" type="warning" effect="plain">
          {{ store.issueCount }} 个问题
        </el-tag>
      </div>
      <div class="col-span-5 justify-self-end">
        <el-button size="small" type="primary" @click="openCreate()">新建封装</el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索封装标题或步骤" />
      </div>
      <p class="col-span-5 justify-self-end text-[11px] text-ink-muted">
        <template v-if="store.duplicates.size">
          {{ store.duplicates.size }} 个封装标题跨文件重复
        </template>
        <template v-else-if="store.conceptCount">封装文件位于项目的 concepts 目录</template>
      </p>
    </div>

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="读取或保存封装文件失败，修正后重试即可。"
    />

    <el-alert
      v-if="store.duplicates.size"
      type="warning"
      show-icon
      :closable="false"
      title="存在跨文件重复的封装标题"
      :description="
        [...store.duplicates.entries()]
          .map(([heading, names]) => `「${heading}」出现在 ${names.join('、')}`)
          .join('；')
      "
    />

    <!-- 列表区 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取封装文件…</p>
        <div v-else-if="filteredDisplays.length" class="flex flex-col gap-2">
          <div
            v-for="display in filteredDisplays"
            :key="display.file.path"
            class="rounded-lg border border-line bg-surface p-3"
          >
            <!-- 文件头 -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-ink">{{ display.file.name }}</h2>
              <div class="flex items-center gap-1">
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="openCreate({ path: display.file.path, name: display.file.name })"
                >
                  添加封装
                </el-button>
                <el-button size="small" text type="danger" @click="deleteFile(display.file)">
                  删除文件
                </el-button>
              </div>
            </div>

            <!-- 文件级解析问题 -->
            <div
              v-if="display.file.issues.length"
              class="mt-2 rounded-md bg-warning/10 px-2 py-1 text-[11px] text-warning"
            >
              <p v-for="(issue, i) in display.file.issues" :key="i">
                <template v-if="issue.conceptHeading">「{{ issue.conceptHeading }}」：</template>
                {{ issue.message }}
              </p>
            </div>

            <!-- 封装列表 -->
            <div v-if="display.rows.length" class="mt-2 flex flex-col gap-2">
              <div
                v-for="row in display.rows"
                :key="row.index"
                class="rounded-md border border-line px-2 py-2"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span class="text-sm text-ink">{{ row.concept.heading }}</span>
                    <el-tag
                      v-for="param in row.concept.params"
                      :key="param"
                      size="small"
                      effect="plain"
                    >
                      {{ param }}
                    </el-tag>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <el-tag size="small" type="info" effect="plain">
                      {{ row.concept.steps.length }} 步
                    </el-tag>
                    <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="deleteConcept(row)">
                      删除
                    </el-button>
                  </div>
                </div>

                <!-- 步骤预览 -->
                <ul class="mt-1.5 flex flex-col gap-0.5">
                  <li
                    v-for="(step, sIndex) in row.concept.steps.slice(0, 3)"
                    :key="sIndex"
                    class="truncate text-[11px] text-ink-muted"
                  >
                    · {{ step.text }}
                    <span v-if="step.table">（含 {{ step.table.rows.length }} 行数据表）</span>
                  </li>
                  <li
                    v-if="row.concept.steps.length > 3"
                    class="text-[11px] text-ink-muted"
                  >
                    · 其余 {{ row.concept.steps.length - 3 }} 步…
                  </li>
                </ul>
              </div>
            </div>
            <p v-else-if="keyword.trim()" class="mt-2 text-[11px] text-ink-muted">
              此文件没有匹配的封装
            </p>
            <p v-else class="mt-2 text-[11px] text-ink-muted">此文件还没有封装</p>
          </div>
        </div>
        <el-empty v-else :description="emptyText" />
      </div>
    </div>

    <!-- 结构化编辑对话框 -->
    <ConceptFormDialog
      v-model="dialogVisible"
      :fixed-target="dialogFixed ? dialogTarget : null"
      :file-concepts="dialogConcepts"
      :concept-index="dialogIndex"
    />
  </div>
</template>
