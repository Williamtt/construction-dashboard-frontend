import type { AlertItem } from '@/types/dashboard'

/** 警報專區假資料，之後可改為 API */
const MOCK_ALERTS: AlertItem[] = [
  {
    id: '1',
    level: 'alarm',
    title: '熱危害',
    value: '高溫 32.5°C',
  },
  {
    id: '2',
    level: 'attention',
    title: '空污',
    value: 'PM2.5: 45',
  },
  {
    id: '3',
    level: 'alarm',
    title: '水位',
    value: '6.3 m',
  },
]

export function useDashboardAlerts() {
  return {
    alerts: MOCK_ALERTS,
  }
}
