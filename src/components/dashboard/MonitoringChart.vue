<!--
  環境監測趨勢圖：使用 vue-echarts (ECharts)。
  支援上限／警戒門檻線（markLine）。之後可擴充 chartType prop（line | bar 等）切換圖表類型。
-->
<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components'
import type { MonitoringChartData } from '@/types/dashboard'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
])

const props = defineProps<{
  data: MonitoringChartData | null
  class?: string
}>()

const option = computed(() => {
  const d = props.data
  if (!d?.series?.length) {
    return { title: { text: '無資料' } }
  }

  const xData = d.series.map((p) => p.time)
  const yData = d.series.map((p) => p.value)

  const markLine: { data: Array<{ yAxis: number; name: string; lineStyle: { color: string; type: string } }> } = {
    data: [],
  }
  if (d.upperLimit != null) {
    markLine.data.push({
      yAxis: d.upperLimit,
      name: '上限',
      lineStyle: { color: '#f97316', type: 'dashed' },
    })
  }
  if (d.warningThreshold != null) {
    markLine.data.push({
      yAxis: d.warningThreshold,
      name: '警戒',
      lineStyle: { color: '#ef4444', type: 'dashed' },
    })
  }

  return {
    title: {
      text: `${d.metricLabel} - 24小時趨勢`,
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = Array.isArray(params) ? params[0] : null
        if (!p) return ''
        const idx = p.dataIndex
        const point = d.series[idx]
        return point ? `${point.time}<br/>${d.metricLabel}: ${point.value} ${d.unit}` : ''
      },
    },
    grid: { left: '3%', right: '4%', bottom: '15%', top: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: { fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      name: d.unit,
      axisLabel: { fontSize: 10 },
      splitLine: { lineStyle: { type: 'dashed', opacity: 0.3 } },
    },
    series: [
      {
        name: d.metricLabel,
        type: 'line',
        data: yData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2 },
        itemStyle: { borderWidth: 2 },
        markLine: markLine.data.length ? markLine : undefined,
      },
    ],
  }
})
</script>

<template>
  <div :class="['w-full', props.data ? 'h-[280px]' : 'min-h-[280px]', props.class]">
    <VChart
      v-if="props.data"
      :option="option"
      autoresize
      class="h-full w-full min-h-[260px]"
    />
    <p
      v-else
      class="flex h-[280px] items-center justify-center text-sm text-muted-foreground"
    >
      請選擇上方監測項目
    </p>
  </div>
</template>
