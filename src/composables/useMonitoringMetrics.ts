import { ref, computed, watch, getCurrentScope, onScopeDispose } from 'vue'
import type { MonitorMetric, MonitoringChartData, MonitoringChartSummary } from '@/types/dashboard'

const AUTO_SWITCH_INTERVAL_MS = 30 * 1000

export function useMonitoringMetrics() {
  const metrics = ref<MonitorMetric[]>([])
  const selectedKey = ref<string>('')
  const autoRotateEnabled = ref(true)

  const chartData = computed<MonitoringChartData | null>(() => null)

  const chartSummary = computed<MonitoringChartSummary | null>(() => null)

  function selectMetric(key: string) {
    selectedKey.value = key
  }

  let timer: ReturnType<typeof setInterval> | null = null

  function startAutoRotate() {
    if (timer) return
    timer = setInterval(() => {
      const keys = metrics.value.map((m) => m.key)
      if (keys.length === 0) return
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
