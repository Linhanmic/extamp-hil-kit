<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SpecTreeNodeItem from '@/components/SpecTreeNodeItem.vue'
import { buildSpecTree } from '@/spec/tree'
import { useConceptsStore, type LoadedConceptFile } from '@/stores/concepts'
import type { Concept } from '@/spec/concept-file'
import ConceptFormDialog, { type ConceptTarget } from '@/components/ConceptFormDialog.vue'

/**
 * 封装库：扫描 specs 下全部 .cpt，左侧为概念目录树，右侧为选中文件详情。
 * 概念筛选只匹配封装标题；编辑与删除仍由对话框和 store 完成。
 */
const store = useConceptsStore()
const keyword = ref('')
const selectedPath = ref('')
const treeOpen = ref(true)
const collapseVersion = ref(0)

const dialogVisible = ref(false)
const dialogFixed = ref(false)
const dialogTarget = ref<ConceptTarget>({ path: '', name: '' })
const dialogConcepts = ref<Concept[]>([])
const dialogIndex = ref(-1)

interface ConceptRow {
  file: LoadedConceptFile
  concept: Concept
  index: number
}

const filteredFiles = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return store.files
  return store.files.filter((file) =>
    file.concepts.some((concept) => concept.heading.toLowerCase().includes(query)),
  )
})
const tree = computed(() => buildSpecTree(filteredFiles.value))
const selectedFile = computed(
  () => filteredFiles.value.find((file) => file.path === selectedPath.value) ?? filteredFiles.value[0] ?? null,
)
const selectedRows = computed<ConceptRow[]>(() => {
  const file = selectedFile.value
  if (!file) return []
  const query = keyword.value.trim().toLowerCase()
  return file.concepts
    .map((concept, index) => ({ file, concept, index }))
    .filter((row) => !query || row.concept.heading.toLowerCase().includes(query))
})

watch(
  filteredFiles,
  (files) => {
    if (!files.some((file) => file.path === selectedPath.value)) {
      selectedPath.value = files[0]?.path ?? ''
    }
  },
  { immediate: true },
)

function toggleTree() {
  if (treeOpen.value) {
    treeOpen.value = false
    collapseVersion.value += 1
  } else {
    treeOpen.value = true
  }
}

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的概念' : 'specs 目录下还没有 cpt 文件，点右上角「新建封装」开始',
)

function openCreate(target?: ConceptTarget) {
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

<!--
  @grid A：标题 7 · 新建 5；概念文本筛选 4；左侧概念树 3 · 右侧详情 9。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-7">
          <h1 class="text-lg font-medium text-ink">封装库</h1>
        </div>
        <div class="col-span-5 justify-self-end">
          <el-button size="small" type="primary" @click="openCreate()">新建封装</el-button>
        </div>
      </div>

      <!-- 概念过滤：只匹配封装标题 -->
      <div class="mt-3 grid grid-cols-12 items-center gap-2">
        <div class="col-span-4">
          <el-input v-model="keyword" size="small" clearable placeholder="概念" />
        </div>
        <p class="col-span-8 justify-self-end text-[11px] text-ink-muted">
          <template v-if="store.duplicates.size">
            {{ store.duplicates.size }} 个封装标题跨文件重复
          </template>
          <template v-else-if="store.conceptCount">封装文件位于项目的 specs 目录</template>
        </p>
      </div>
    </div>

    <el-alert
      v-if="store.error"
      class="w-[calc(11.5/12*100%)]"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="读取或保存封装文件失败，修正后重试即可。"
    />

    <el-alert
      v-if="store.duplicates.size"
      class="w-[calc(11.5/12*100%)]"
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

    <div class="w-[calc(11.5/12*100%)]">
      <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取封装文件…</p>
      <el-empty v-else-if="!filteredFiles.length" :description="emptyText" />

      <div v-else class="grid grid-cols-12 gap-3">
        <!-- 左：概念目录树 -->
        <div class="col-span-3">
          <div class="max-h-[65vh] overflow-y-auto border border-line py-1">
            <button
              type="button"
              class="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] font-medium text-ink outline-none hover:bg-surface focus-visible:ring-1 focus-visible:ring-primary/40"
              :title="treeOpen ? '一键折叠全部目录' : '展开概念目录'"
              @click="toggleTree"
            >
              <svg class="size-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
                <path v-if="treeOpen" d="M4 6.5 8 10.5 12 6.5" />
                <path v-else d="M6.5 4 10.5 8 6.5 12" />
              </svg>
              <span>概念</span>
            </button>
            <template v-if="treeOpen">
              <SpecTreeNodeItem
                v-for="node in tree"
                :key="`${node.type}-${node.path}`"
                :node="node"
                :depth="0"
                :selected-path="selectedFile?.path ?? ''"
                :collapse-version="collapseVersion"
                @select="selectedPath = $event"
              />
            </template>
          </div>
        </div>

        <!-- 右：选中文件的封装详情 -->
        <div class="col-span-9 min-w-0">
          <div v-if="selectedFile" class="border border-line p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="min-w-0 truncate text-sm font-medium text-ink" :title="selectedFile.name">
                {{ selectedFile.name }}
              </h2>
              <div class="flex items-center gap-1">
                <el-button
                  size="small"
                  text
                  type="primary"
                  @click="openCreate({ path: selectedFile.path, name: selectedFile.name })"
                >
                  添加封装
                </el-button>
                <el-button size="small" text type="danger" @click="deleteFile(selectedFile)">
                  删除文件
                </el-button>
              </div>
            </div>

            <div
              v-if="selectedFile.issues.length"
              class="mt-2 rounded-md bg-warning/10 px-2 py-1 text-[11px] text-warning"
            >
              <p v-for="(issue, i) in selectedFile.issues" :key="i">
                <template v-if="issue.conceptHeading">「{{ issue.conceptHeading }}」：</template>
                {{ issue.message }}
              </p>
            </div>

            <div v-if="selectedRows.length" class="mt-2 flex flex-col gap-2">
              <div
                v-for="row in selectedRows"
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

                <ul class="mt-1.5 flex flex-col gap-0.5">
                  <li
                    v-for="(step, sIndex) in row.concept.steps"
                    :key="sIndex"
                    class="break-all text-[11px] text-ink-muted"
                  >
                    · {{ step.text }}
                    <span v-if="step.table">（含 {{ step.table.rows.length }} 行数据表）</span>
                  </li>
                </ul>
              </div>
            </div>
            <p v-else class="mt-2 text-[11px] text-ink-muted">
              {{ keyword.trim() ? '此文件没有匹配的概念' : '此文件还没有封装' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <ConceptFormDialog
      v-model="dialogVisible"
      :fixed-target="dialogFixed ? dialogTarget : null"
      :file-concepts="dialogConcepts"
      :concept-index="dialogIndex"
    />
  </div>
</template>
