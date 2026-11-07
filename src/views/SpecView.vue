<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSpecsStore } from '@/stores/specs'

/**
 * 规格页：根据配置参数算出每个 spec 场景的适用车型，预览并一键写回场景标签。
 * 数据由 store 在应用启动 / 切换项目时读回；配置参数改动后预览自动重算。
 */
const store = useSpecsStore()
const keyword = ref('')
const applying = ref(false)

interface ScenarioRow {
  heading: string
  condition: string | null
  before: string[]
  after: string[]
  changed: boolean
  notApplicable: boolean
}

interface SpecDisplay {
  name: string
  specCondition: string | null
  rows: ScenarioRow[]
  changedCount: number
}

function sameTags(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((tag, index) => tag === b[index])
}

const displays = computed<SpecDisplay[]>(() =>
  store.entries.map((entry) => {
    const rows: ScenarioRow[] = entry.analysis.parsed.scenarios.map((scenario, index) => {
      const change = entry.analysis.changes[index]
      const before = change?.before ?? []
      const after = change?.after ?? []
      return {
        heading: scenario.heading,
        condition: scenario.condition,
        before,
        after,
        changed: !sameTags(before, after),
        notApplicable: (entry.analysis.vehicles[index]?.length ?? 0) === 0,
      }
    })
    return {
      name: entry.name,
      specCondition: entry.analysis.parsed.specCondition,
      rows,
      changedCount: rows.filter((row) => row.changed).length,
    }
  }),
)

const filteredDisplays = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return displays.value
  return displays.value
    .map((display) => ({
      ...display,
      rows: display.rows.filter(
        (row) =>
          row.heading.toLowerCase().includes(query) ||
          (row.condition ?? '').toLowerCase().includes(query) ||
          row.after.some((tag) => tag.toLowerCase().includes(query)),
      ),
    }))
    .filter((display) => display.rows.length || display.name.toLowerCase().includes(query))
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的场景' : '该项目还没有 spec 文件',
)

async function onApply() {
  applying.value = true
  const result = await store.apply()
  applying.value = false
  if (result.ok) {
    ElMessage.success(result.count ? `已更新 ${result.count} 个 spec 文件的场景标签` : '没有需要更新的标签')
  } else {
    ElMessage.error(result.error)
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">规格</h1>
        <el-tag size="small" type="info" effect="plain">{{ store.fileCount }} 个文件</el-tag>
        <el-tag size="small" type="info" effect="plain">{{ store.scenarioCount }} 个场景</el-tag>
        <el-tag v-if="store.notApplicableCount" size="small" type="warning" effect="plain">
          {{ store.notApplicableCount }} 个场景不适用
        </el-tag>
      </div>
      <div class="col-span-5 justify-self-end">
        <el-button
          size="small"
          type="primary"
          :loading="applying || store.saving"
          :disabled="!store.changedCount"
          @click="onApply"
        >
          更新场景标签
        </el-button>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索场景、适用条件或标签" />
      </div>
      <p class="col-span-5 justify-self-end text-[11px] text-ink-muted">
        <template v-if="store.changedCount">
          {{ store.changedCount }} 个文件待更新
        </template>
        <template v-else-if="store.hasData">标签已是最新</template>
      </p>
    </div>

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="读取或保存 spec 文件失败，修正后重试即可。"
    />

    <el-alert
      v-if="store.warnings.length"
      type="warning"
      show-icon
      :closable="false"
      title="部分适用条件无法解析"
      :description="store.warnings.join('；')"
    />

    <!-- 列表区 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取 spec 文件…</p>
        <div v-else-if="filteredDisplays.length" class="flex flex-col gap-2">
          <div
            v-for="display in filteredDisplays"
            :key="display.name"
            class="rounded-lg border border-line bg-surface p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-ink">{{ display.name }}</h2>
              <el-tag v-if="display.changedCount" size="small" type="warning" effect="plain">
                {{ display.changedCount }} 个场景标签将更新
              </el-tag>
            </div>

            <p
              v-if="display.specCondition"
              class="mt-1 truncate text-[11px] text-ink-muted"
              title="规格书级适用条件（作用于全部场景）"
            >
              规格书适用条件：{{ display.specCondition }}
            </p>

            <el-table :data="display.rows" size="small" class="mt-2" max-height="320">
              <el-table-column prop="heading" label="场景" min-width="130" show-overflow-tooltip />
              <el-table-column label="适用条件" min-width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <span class="text-[11px] text-ink-muted">{{ row.condition || '（默认全部车型）' }}</span>
                </template>
              </el-table-column>
              <el-table-column label="现有标签" min-width="120">
                <template #default="{ row }">
                  <template v-if="row.before.length">
                    <el-tag
                      v-for="tag in row.before"
                      :key="tag"
                      size="small"
                      type="info"
                      effect="plain"
                      class="mr-1"
                    >
                      {{ tag }}
                    </el-tag>
                  </template>
                  <span v-else class="text-[11px] text-ink-muted">（无）</span>
                </template>
              </el-table-column>
              <el-table-column label="新标签" min-width="140">
                <template #default="{ row }">
                  <el-tag
                    v-for="tag in row.after"
                    :key="tag"
                    size="small"
                    :type="tag === '不适用' ? 'warning' : 'primary'"
                    effect="plain"
                    class="mr-1"
                  >
                    {{ tag }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="88" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.notApplicable" size="small" type="warning" effect="plain">
                    不适用
                  </el-tag>
                  <el-tag v-else-if="row.changed" size="small" type="primary" effect="plain">
                    将更新
                  </el-tag>
                  <el-tag v-else size="small" type="info" effect="plain">无变化</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
        <el-empty v-else :description="emptyText" />
      </div>
    </div>
  </div>
</template>
