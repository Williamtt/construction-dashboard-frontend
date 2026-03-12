import type { AlertItem } from '@/types/dashboard'

export function useDashboardAlerts() {
  const alerts: AlertItem[] = []
  return {
    alerts,
  }
}
