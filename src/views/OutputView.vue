<script setup lang="ts">
import { computed, ref } from 'vue'
import { useOutputStore } from '@/stores/output'

/**
 * 出声位置页：展示出声位置文件里的检查场景（标题、适用车型、步骤与出声扬声器）。
 * 数据由 store 在应用启动 / 切换项目时读回，只做展示。
 */
const store = useOutputStore()
const keyword = ref('')

const filteredScenarios = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return store.scenarios
  return store.scenarios.filter((scenario) => {
    if (scenario.title.toLowerCase().includes(query)) return true
    if (scenario.vehicles.some((vehicle) => vehicle.toLowerCase().includes(query))) return true
    if (scenario.speakers.some((speaker) => speaker.toLowerCase().includes(query))) return true
    return false
  })
})

const emptyText = computed(() =>
  keyword.value.trim() ? '未找到匹配的检查场景' : '该项目还没有出声位置数据',
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- 标题行 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-12 flex flex-wrap items-center gap-2">
        <h1 class="text-lg font-medium text-ink">出声位置</h1>
        <el-tag size="small" type="info" effect="plain">{{ store.scenarioCount }} 个场景</el-tag>
        <el-tag size="small" type="info" effect="plain">{{ store.speakerCount }} 个出声位置</el-tag>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="grid grid-cols-12 items-center gap-2">
      <div class="col-span-7">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索场景、车型或扬声器" />
      </div>
    </div>

    <el-alert
      v-if="store.unconfigured"
      type="info"
      :closable="false"
      title="还没有配置出声位置文件"
      description="请在项目设置里指定出声位置文件（如 config/出声位置/出声位置.txt）。"
    />

    <el-alert
      v-if="store.error"
      type="error"
      show-icon
      :closable="false"
      :title="store.error"
      description="文件内容不可用，修正后重试即可。"
    />

    <!-- 列表区 -->
    <div class="grid grid-cols-12">
      <div class="col-span-12 min-w-0">
        <p v-if="store.loading" class="text-[11px] text-ink-muted">正在读取出声位置…</p>
        <div v-else-if="filteredScenarios.length" class="flex flex-col gap-2">
          <div
            v-for="(scenario, index) in filteredScenarios"
            :key="index"
            class="rounded-lg border border-line bg-surface p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-sm font-medium text-ink">
                {{ scenario.title || '（未命名场景）' }}
              </h2>
              <div v-if="scenario.vehicles.length" class="flex flex-wrap gap-1">
                <el-tag
                  v-for="vehicle in scenario.vehicles"
                  :key="vehicle"
                  size="small"
                  type="info"
                  effect="plain"
                >
                  {{ vehicle }}
                </el-tag>
              </div>
            </div>

            <ol v-if="scenario.steps.length" class="mt-2 flex flex-col gap-0.5">
              <li
                v-for="(step, stepIndex) in scenario.steps"
                :key="stepIndex"
                class="text-[11px] leading-relaxed text-ink-muted"
              >
                {{ stepIndex + 1 }}. {{ step }}
              </li>
            </ol>

            <div v-if="scenario.speakers.length" class="mt-2 flex flex-wrap items-center gap-1">
              <span class="text-[11px] text-ink-muted">出声位置：</span>
              <el-tag
                v-for="speaker in scenario.speakers"
                :key="speaker"
                size="small"
                type="primary"
                effect="plain"
              >
                {{ speaker }}
              </el-tag>
            </div>
          </div>
        </div>
        <el-empty v-else :description="emptyText" />
      </div>
    </div>
  </div>
</template>
