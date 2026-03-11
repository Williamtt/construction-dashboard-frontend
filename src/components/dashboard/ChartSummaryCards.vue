<script setup lang="ts">
import type { MonitoringChartSummary } from '@/types/dashboard'

defineProps<{
  summary: MonitoringChartSummary | null
}>()
</script>

<template>
  <div
    v-if="summary"
    class="grid grid-cols-2 gap-3 sm:grid-cols-4"
  >
    <div
      class="rounded-lg border border-transparent px-4 py-3"
      style="background-color: var(--summary-current-bg); color: var(--summary-current-fg)"
    >
      <p class="text-xs font-medium opacity-90">當前數值</p>
      <p class="text-lg font-bold tabular-nums">
        {{ summary.current }} {{ summary.unit }}
      </p>
    </div>
    <div
      class="rounded-lg border border-transparent px-4 py-3"
      style="background-color: var(--summary-avg-bg); color: var(--summary-avg-fg)"
    >
      <p class="text-xs font-medium opacity-90">平均值</p>
      <p class="text-lg font-bold tabular-nums">
        {{ summary.average }} {{ summary.unit }}
      </p>
    </div>
    <div
      class="rounded-lg border border-transparent px-4 py-3"
      style="background-color: var(--summary-max-bg); color: var(--summary-max-fg)"
    >
      <p class="text-xs font-medium opacity-90">最高值</p>
      <p class="text-lg font-bold tabular-nums">
        {{ summary.max }} {{ summary.unit }}
      </p>
    </div>
    <div
      class="rounded-lg border border-transparent px-4 py-3"
      style="background-color: var(--summary-min-bg); color: var(--summary-min-fg)"
    >
      <p class="text-xs font-medium opacity-90">最低值</p>
      <p class="text-lg font-bold tabular-nums">
        {{ summary.min }} {{ summary.unit }}
      </p>
    </div>
  </div>
</template>
