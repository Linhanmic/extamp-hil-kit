<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfigsStore } from '@/stores/configs'
import { useSpecsStore } from '@/stores/specs'
import { useTasksStore } from '@/stores/tasks'
import { useQueueStore, type QueueKind, type QueueStatus } from '@/stores/queue'

/** 测试队列：任务 / 单场景 / 整份规格书按顺序执行 */
const specsStore = useSpecsStore()
const configsStore = useConfigsStore()
const tasksStore = useTasksStore()
const queueStore = useQueueStore()

const queueVehicle = ref('')
const selectedTaskId = ref('')
const scenarioSpecPath = ref('')
const scenarioHeading = ref('')
const wholeSpecPath = ref('')

const scenarioOptions = computed(() => {
  const entry = specsStore.entries.find((item) => item.path === scenarioSpecPath.value)
  return entry?.analysis.parsed.scenarios ?? []
})

const kindLabels: Record<QueueKind, string> = {
  task: '任务',
  scenario: '场景',
  spec: '规格书',
}
const statusLabels: Record<QueueStatus, string> = {
  pending: '等待',
  running: '运行中',
  success: '成功',
  failed: '失败',
}

function statusType(status: QueueStatus) {
  if (status === 'success') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'running') return 'primary'
  return 'info'
}

function addTask() {
  const task = tasksStore.tasks.find((item) => item.id === selectedTaskId.value)
  if (!task) return
  queueStore.enqueueTask(task, queueVehicle.value)
  selectedTaskId.value = ''
}

function addScenario() {
  if (!scenarioSpecPath.value || !scenarioHeading.value) return
  queueStore.enqueueScenario(
    { path: scenarioSpecPath.value, heading: scenarioHeading.value },
    queueVehicle.value,
  )
  scenarioHeading.value = ''
}

function addSpec() {
  const entry = specsStore.entries.find((item) => item.path === wholeSpecPath.value)
  if (!entry) return
  queueStore.enqueueSpec(entry.path, entry.name, queueVehicle.value)
  wholeSpecPath.value = ''
}
</script>

<!--
  @grid A：三类入队均为 类型 2 · 选择 8 · 按钮 2；队列表格 顺序 1 · 类型 2 · 名称 5 · 状态 2 · 操作 2。
-->
<template>
  <div class="flex flex-col gap-3">
    <div class="w-[calc(11.5/12*100%)]">
      <div class="grid grid-cols-12 items-center gap-2">
        <div class="col-span-6 flex items-center gap-2">
          <h1 class="text-lg font-medium text-ink">测试队列</h1>
          <el-tag size="small" type="info" effect="plain">等待 {{ queueStore.pendingCount }}</el-tag>
          <el-tag size="small" type="success" effect="plain">成功 {{ queueStore.successCount }}</el-tag>
          <el-tag size="small" type="danger" effect="plain">失败 {{ queueStore.failedCount }}</el-tag>
        </div>
        <div class="col-span-6 flex justify-end gap-2">
          <el-button size="small" :disabled="!queueStore.items.length" @click="queueStore.clearFinished">
            清除已完成
          </el-button>
          <el-button
            size="small"
            type="primary"
            :loading="queueStore.running"
            :disabled="!queueStore.pendingCount"
            @click="queueStore.start"
          >
            开始执行
          </el-button>
        </div>
      </div>
    </div>

    <!-- 入队区 -->
    <div class="w-[calc(11.5/12*100%)] rounded-lg border border-line bg-surface-soft p-3">
      <div class="flex flex-col gap-2">
        <div class="grid grid-cols-12 items-center gap-2">
          <span class="col-span-2 text-[11px] text-ink-muted">运行车型</span>
          <div class="col-span-8">
            <el-select
              v-model="queueVehicle"
              size="small"
              clearable
              filterable
              placeholder="全部车型（运行时传 gauge --tags）"
              class="w-full"
            >
              <el-option
                v-for="vehicle in configsStore.vehicleOptions"
                :key="vehicle"
                :label="vehicle"
                :value="vehicle"
              />
            </el-select>
          </div>
          <span class="col-span-2 text-right text-[11px] text-ink-muted">入队时记录</span>
        </div>

        <div class="grid grid-cols-12 items-center gap-2">
          <span class="col-span-2 text-[11px] text-ink-muted">任务</span>
          <div class="col-span-8">
            <el-select v-model="selectedTaskId" size="small" placeholder="选择已保存任务" class="w-full">
              <el-option
                v-for="task in tasksStore.tasks"
                :key="task.id"
                :label="task.name"
                :value="task.id"
              />
            </el-select>
          </div>
          <div class="col-span-2 flex justify-end">
            <el-button size="small" :disabled="!selectedTaskId" @click="addTask">入队</el-button>
          </div>
        </div>

        <div class="grid grid-cols-12 items-center gap-2">
          <span class="col-span-2 text-[11px] text-ink-muted">场景</span>
          <div class="col-span-4">
            <el-select v-model="scenarioSpecPath" size="small" placeholder="规格书" class="w-full">
              <el-option
                v-for="entry in specsStore.entries"
                :key="entry.path"
                :label="entry.name"
                :value="entry.path"
              />
            </el-select>
          </div>
          <div class="col-span-4">
            <el-select v-model="scenarioHeading" size="small" placeholder="场景" class="w-full">
              <el-option
                v-for="scenario in scenarioOptions"
                :key="scenario.heading"
                :label="scenario.heading"
                :value="scenario.heading"
              />
            </el-select>
          </div>
          <div class="col-span-2 flex justify-end">
            <el-button
              size="small"
              :disabled="!scenarioSpecPath || !scenarioHeading"
              @click="addScenario"
            >
              入队
            </el-button>
          </div>
        </div>

        <div class="grid grid-cols-12 items-center gap-2">
          <span class="col-span-2 text-[11px] text-ink-muted">规格书</span>
          <div class="col-span-8">
            <el-select v-model="wholeSpecPath" size="small" placeholder="选择整份规格书" class="w-full">
              <el-option
                v-for="entry in specsStore.entries"
                :key="entry.path"
                :label="entry.name"
                :value="entry.path"
              />
            </el-select>
          </div>
          <div class="col-span-2 flex justify-end">
            <el-button size="small" :disabled="!wholeSpecPath" @click="addSpec">入队</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 队列状态 -->
    <div class="w-[calc(11.5/12*100%)]">
      <el-empty v-if="!queueStore.items.length" description="队列为空，请先添加任务、场景或规格书" />
      <div v-else class="border border-line">
        <div class="grid grid-cols-12 items-center border-b border-line bg-surface-soft text-[11px] font-medium text-ink">
          <div class="col-span-1 px-2 py-2 text-center">顺序</div>
          <div class="col-span-2 px-2 py-2">类型</div>
          <div class="col-span-5 px-2 py-2">名称</div>
          <div class="col-span-2 px-2 py-2 text-center">状态</div>
          <div class="col-span-2 px-2 py-2 text-center">操作</div>
        </div>
        <div
          v-for="(item, index) in queueStore.items"
          :key="item.id"
          class="grid grid-cols-12 items-center border-b border-line/50 last:border-b-0"
        >
          <div class="col-span-1 px-2 py-1.5 text-center text-[11px] text-ink-muted">{{ index + 1 }}</div>
          <div class="col-span-2 px-2 py-1.5 text-[11px] text-ink">{{ kindLabels[item.kind] }}</div>
          <button
            type="button"
            class="col-span-5 min-w-0 truncate px-2 py-1.5 text-left text-[11px] text-ink outline-none hover:text-primary"
            :title="`${item.name}（点击查看输出）`"
            @click="queueStore.showOutput(item)"
          >
            {{ item.name }}
            <span v-if="item.vehicle" class="text-ink-muted"> · {{ item.vehicle }}</span>
          </button>
          <div class="col-span-2 flex justify-center px-2 py-1.5">
            <el-tag size="small" :type="statusType(item.status)" effect="plain">
              {{ statusLabels[item.status] }}
            </el-tag>
          </div>
          <div class="col-span-2 flex items-center justify-center gap-0.5 px-1 py-1">
            <el-button
              size="small"
              link
              :disabled="item.status !== 'pending' || index === 0"
              @click="queueStore.move(item.id, -1)"
            >
              上移
            </el-button>
            <el-button
              size="small"
              link
              :disabled="item.status !== 'pending' || index === queueStore.items.length - 1"
              @click="queueStore.move(item.id, 1)"
            >
              下移
            </el-button>
            <el-button
              size="small"
              link
              type="danger"
              :disabled="item.status === 'running'"
              @click="queueStore.remove(item.id)"
            >
              移除
            </el-button>
          </div>
        </div>
      </div>
      <p class="mt-1 text-[11px] text-ink-muted">点击队列名称可在底部终端查看该项输出；执行中也可继续入队。</p>
    </div>
  </div>
</template>
