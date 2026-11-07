<script setup lang="ts">
import { computed } from 'vue'
import type { VolumeCurve } from '@/stores/volume-chart'

/** 单音源音量曲线：X=0–39 音量，Y=dB；空档位断开，相同曲线已在数据层合并 */
const props = defineProps<{ source: string; curves: VolumeCurve[] }>()

const WIDTH = 680
const HEIGHT = 280
const LEFT = 46
const RIGHT = 16
const TOP = 18
const BOTTOM = 38
const PLOT_WIDTH = WIDTH - LEFT - RIGHT
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM
const COLORS = ['#337ecc', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9e7cff', '#36a3a3']

const values = computed(() =>
  props.curves.flatMap((curve) => curve.values.filter((value): value is number => value !== null)),
)
const yDomain = computed(() => {
  if (!values.value.length) return { min: -1, max: 1 }
  let min = Math.floor(Math.min(...values.value) - 2)
  let max = Math.ceil(Math.max(...values.value) + 2)
  if (min === max) {
    min -= 1
    max += 1
  }
  return { min, max }
})
const yTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const value = yDomain.value.min + ((yDomain.value.max - yDomain.value.min) * index) / 4
    return { value, label: Number.isInteger(value) ? String(value) : value.toFixed(1) }
  }),
)
const xTicks = [0, 5, 10, 15, 20, 25, 30, 35, 39]

function x(level: number): number {
  return LEFT + (level / 39) * PLOT_WIDTH
}

function y(value: number): number {
  const { min, max } = yDomain.value
  return TOP + ((max - value) / (max - min)) * PLOT_HEIGHT
}

interface Segment {
  points: { x: number; y: number }[]
  path: string
}

const renderedCurves = computed(() =>
  props.curves.map((curve, curveIndex) => {
    const segments: Segment[] = []
    let points: { x: number; y: number }[] = []
    const flush = () => {
      if (!points.length) return
      segments.push({
        points,
        path: points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y}`).join(' '),
      })
      points = []
    }
    curve.values.forEach((value, level) => {
      if (value === null) flush()
      else points.push({ x: x(level), y: y(value) })
    })
    flush()
    return { ...curve, color: COLORS[curveIndex % COLORS.length], segments }
  }),
)
</script>

<template>
  <div class="rounded-lg border border-line bg-surface p-3">
    <p class="text-[12px] font-medium text-ink">{{ source }}</p>
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="mt-1 block h-auto w-full" role="img">
      <title>{{ source }}音量曲线</title>
      <!-- 网格与 Y 轴 -->
      <g v-for="tick in yTicks" :key="tick.value">
        <line
          :x1="LEFT"
          :x2="WIDTH - RIGHT"
          :y1="y(tick.value)"
          :y2="y(tick.value)"
          stroke="var(--el-border-color-lighter)"
          stroke-width="0.7"
        />
        <text
          :x="LEFT - 7"
          :y="y(tick.value)"
          text-anchor="end"
          dominant-baseline="central"
          fill="var(--el-text-color-secondary)"
          font-size="10"
        >
          {{ tick.label }}
        </text>
      </g>
      <!-- X 轴 -->
      <g v-for="tick in xTicks" :key="tick">
        <line
          :x1="x(tick)"
          :x2="x(tick)"
          :y1="TOP"
          :y2="HEIGHT - BOTTOM"
          stroke="var(--el-border-color-lighter)"
          stroke-width="0.5"
        />
        <text
          :x="x(tick)"
          :y="HEIGHT - BOTTOM + 15"
          text-anchor="middle"
          fill="var(--el-text-color-secondary)"
          font-size="10"
        >
          {{ tick }}
        </text>
      </g>
      <text :x="LEFT" :y="11" fill="var(--el-text-color-secondary)" font-size="10">dB</text>
      <text
        :x="WIDTH - RIGHT"
        :y="HEIGHT - 5"
        text-anchor="end"
        fill="var(--el-text-color-secondary)"
        font-size="10"
      >
        音量
      </text>

      <!-- 曲线：空档位分段，孤立点保留 -->
      <g v-for="curve in renderedCurves" :key="curve.label">
        <template v-for="(segment, index) in curve.segments" :key="index">
          <path
            v-if="segment.points.length > 1"
            :d="segment.path"
            fill="none"
            :stroke="curve.color"
            stroke-width="1.7"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <circle
            v-else
            :cx="segment.points[0]!.x"
            :cy="segment.points[0]!.y"
            r="2.5"
            :fill="curve.color"
          />
        </template>
      </g>
    </svg>

    <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      <span
        v-for="curve in renderedCurves"
        :key="curve.label"
        class="inline-flex max-w-full items-center gap-1 text-[11px] text-ink-muted"
        :title="curve.label"
      >
        <span class="inline-block h-0.5 w-4 shrink-0" :style="{ backgroundColor: curve.color }" />
        <span class="max-w-56 truncate">{{ curve.label }}</span>
      </span>
    </div>
  </div>
</template>
