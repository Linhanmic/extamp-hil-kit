<script setup lang="ts">
import { ref } from 'vue'
import type { SpecTreeNode } from '@/spec/tree'
import { specDisplayName } from '@/spec/tree'

const props = defineProps<{
  node: SpecTreeNode
  depth: number
  selectedPath: string
}>()

const emit = defineEmits<{ select: [path: string] }>()
const open = ref(true)
</script>

<template>
  <div>
    <button
      v-if="props.node.type === 'directory'"
      type="button"
      class="flex w-full items-center gap-1 px-2 py-1 text-left text-[11px] text-ink-muted outline-none hover:bg-surface focus-visible:ring-1 focus-visible:ring-primary/40"
      :style="{ paddingLeft: `${props.depth * 12 + 8}px` }"
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
      class="w-full truncate px-2 py-1 text-left text-[11px] outline-none hover:bg-surface focus-visible:ring-1 focus-visible:ring-primary/40"
      :class="selectedPath === props.node.path ? 'bg-primary/10 text-primary' : 'text-ink'"
      :style="{ paddingLeft: `${props.depth * 12 + 8}px` }"
      :title="props.node.name"
      @click="emit('select', props.node.path)"
    >
      {{ specDisplayName(props.node.name) }}
    </button>

    <template v-if="props.node.type === 'directory' && open">
      <SpecTreeNodeItem
        v-for="child in props.node.children"
        :key="`${child.type}-${child.path}`"
        :node="child"
        :depth="props.depth + 1"
        :selected-path="selectedPath"
        @select="emit('select', $event)"
      />
    </template>
  </div>
</template>
