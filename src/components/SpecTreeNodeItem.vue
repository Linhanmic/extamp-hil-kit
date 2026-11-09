<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SpecTreeNode } from '@/spec/tree'
import { specCheckState, specDisplayName } from '@/spec/tree'

const props = defineProps<{
  node: SpecTreeNode
  depth: number
  selectedPath: string
  /** 仅规格书树开启 checkbox；封装库复用树但不显示 */
  selectable?: boolean
  checkedPaths?: Set<string>
  /** 根节点一键折叠时递增，所有目录同时收起 */
  collapseVersion?: number
  /** 有适用条件提示的 spec 路径：文件名前亮一个提示点 */
  warningPaths?: Set<string>
}>()

const emit = defineEmits<{
  select: [path: string]
  toggle: [node: SpecTreeNode, checked: boolean]
}>()
const open = ref(true)
const checkState = computed(() => specCheckState(props.node, props.checkedPaths ?? new Set()))

watch(
  () => props.collapseVersion,
  () => {
    open.value = false
  },
)

function toggleChecked() {
  emit('toggle', props.node, checkState.value !== 'checked')
}
</script>

<template>
  <div>
    <div
      class="flex items-center"
      :style="{ paddingLeft: `${props.depth * 12 + 4}px` }"
    >
      <el-checkbox
        v-if="props.selectable"
        size="small"
        :model-value="checkState === 'checked'"
        :indeterminate="checkState === 'indeterminate'"
        :aria-label="`选择${props.node.name}`"
        @change="toggleChecked"
      />
      <button
        v-if="props.node.type === 'directory'"
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1 px-1 py-1 text-left text-[11px] text-ink-muted outline-none hover:bg-surface focus-visible:ring-1 focus-visible:ring-primary/40"
        @click="open = !open"
      >
        <svg class="size-3 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4">
          <path v-if="open" d="M4 6.5 8 10.5 12 6.5" />
          <path v-else d="M6.5 4 10.5 8 6.5 12" />
        </svg>
        <span class="truncate">{{ props.node.name }}</span>
      </button>

      <button
        v-else
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1 px-1 py-1 text-left text-[11px] outline-none hover:bg-surface focus-visible:ring-1 focus-visible:ring-primary/40"
        :class="selectedPath === props.node.path ? 'bg-primary/10 text-primary' : 'text-ink'"
        :title="props.node.name"
        @click="emit('select', props.node.path)"
      >
        <span class="truncate">{{ specDisplayName(props.node.name) }}</span>
        <span
          v-if="props.warningPaths?.has(props.node.path)"
          class="size-1.5 shrink-0 rounded-full bg-[var(--el-color-warning)]"
          title="该文件有适用条件提示"
        />
      </button>
    </div>

    <template v-if="props.node.type === 'directory' && open">
      <SpecTreeNodeItem
        v-for="child in props.node.children"
        :key="`${child.type}-${child.path}`"
        :node="child"
        :depth="props.depth + 1"
        :selected-path="selectedPath"
        :selectable="selectable"
        :checked-paths="checkedPaths"
        :collapse-version="collapseVersion"
        :warning-paths="warningPaths"
        @select="emit('select', $event)"
        @toggle="(node, checked) => emit('toggle', node, checked)"
      />
    </template>
  </div>
</template>
