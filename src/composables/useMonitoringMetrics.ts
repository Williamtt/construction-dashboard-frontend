import { ref, computed, watch, getCurrentScope, onScopeDispose } from 'vue'
import type { MonitorMetric, MonitoringChartData, MonitoringChartSummary } from '@/types/dashboard'

const AUTO_SWITCH_INTERVAL_MS = 30 * 1000

/** 環境監測項目假資料（上方卡片） */
const MOCK_METRICS: MonitorMetric[] = [
  { id: '1', key: 'temperature', label: '溫度', value: 34.8, unit: '°C' },
  { id: '2', key: 'humidity', label: '濕度', value: 52, unit: '%' },
  { id: '3', key: 'pm25', label: 'PM2.5', value: 56, unit: 'µg/m³' },
  { id: '4', key: 'wind', label: '風速', value: 4.5, unit: 'm/s' },
  { id: '5', key: 'rainfall', label: '雨量', value: 5.2, unit: 'mm' },
  { id: '6', key: 'waterLevel', label: '水位', value: 6.5, unit: 'm' },
]

/** 各項目 24h 趨勢假資料（可依 key 擴充） */
function buildMockTrend(key: string): MonitoringChartData['series'] {
  const base = key === 'waterLevel' ? 5.5 : key === 'temperature' ? 32 : key === 'humidity' ? 50 : 40
  const points: MonitoringChartData['series'] = []
  for (let i = 0; i < 24; i++) {
    const h = String(i).padStart(2, '0')
    points.push({
      time: `${h}:00`,
      value: Number((base + Math.sin(i / 3) * 1.2 + Math.random() * 0.5).toFixed(1)),
    })
  }
  return points
}

const chartDataByKey: Record<string, Omit<MonitoringChartData, 'metricKey' | 'metricLabel' | 'unit'> & { metricLabel: string; unit: string }> = {
  temperature: {
    metricLabel: '溫度',
    unit: '°C',
    series: buildMockTrend('temperature'),
  },
  humidity: {
    metricLabel: '濕度',
    unit: '%',
    series: buildMockTrend('humidity'),
  },
  pm25: {
    metricLabel: 'PM2.5',
    unit: 'µg/m³',
    series: buildMockTrend('pm25'),
  },
  wind: {
    metricLabel: '風速',
    unit: 'm/s',
    series: buildMockTrend('wind'),
  },
  rainfall: {
    metricLabel: '雨量',
    unit: 'mm',
    series: buildMockTrend('rainfall'),
  },
  waterLevel: {
    metricLabel: '水位',
    unit: 'm',
    series: buildMockTrend('waterLevel'),
    upperLimit: 6.2,
    warningThreshold: 6,
  },
}

export function useMonitoringMetrics() {
  const selectedKey = ref<string>(MOCK_METRICS[0]?.key ?? '')
  const autoRotateEnabled = ref(true)

  const metrics = MOCK_METRICS

  const chartData = computed<MonitoringChartData | null>(() => {
    const key = selectedKey.value
    const meta = chartDataByKey[key]
    if (!meta) return null
    return {
      metricKey: key,
      metricLabel: meta.metricLabel,
      unit: meta.unit,
      series: meta.series,
      upperLimit: meta.upperLimit,
      warningThreshold: meta.warningThreshold,
    }
  })

  /** 圖表下方摘要（當前、平均、最高、最低），依選中項目與 series 計算 */
  const chartSummary = computed<MonitoringChartSummary | null>(() => {
    const key = selectedKey.value
    const meta = chartDataByKey[key]
    const metric = MOCK_METRICS.find((m) => m.key === key)
    if (!meta?.series?.length || !metric) return null
    const values = meta.series.map((p) => p.value)
    const numValue = typeof metric.value === 'number' ? metric.value : Number(metric.value) || values[values.length - 1]
    const sum = values.reduce((a, b) => a + b, 0)
    return {
      current: Number(numValue.toFixed(1)),
      average: Number((sum / values.length).toFixed(1)),
      max: Number(Math.max(...values).toFixed(1)),
      min: Number(Math.min(...values).toFixed(1)),
      unit: meta.unit,
    }
  })

  function selectMetric(key: string) {
    selectedKey.value = key
  }

  /** 每 30 秒自動切換到下一個監測項目（僅在 autoRotateEnabled 為 true 時執行） */
  let timer: ReturnType<typeof setInterval> | null = null

  function startAutoRotate() {
    if (timer) return
    timer = setInterval(() => {
      const keys = MOCK_METRICS.map((m) => m.key)
      const idx = keys.indexOf(selectedKey.value)
      const nextIdx = idx < 0 ? 0 : (idx + 1) % keys.length
      selectedKey.value = keys[nextIdx]
    }, AUTO_SWITCH_INTERVAL_MS)
  }

  function stopAutoRotate() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  watch(
    autoRotateEnabled,
    (enabled) => {
      if (enabled) startAutoRotate()
      else stopAutoRotate()
    },
    { immediate: true },
  )

  const scope = getCurrentScope()
  if (scope) {
    onScopeDispose(() => stopAutoRotate())
  }

  return {
    metrics,
    selectedKey,
    chartData,
    chartSummary,
    autoRotateEnabled,
    selectMetric,
  }
}
