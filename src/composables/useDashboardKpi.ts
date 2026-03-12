import type { ProjectInfoKpi, ProgressKpi, BudgetKpi } from '@/types/dashboard'

export function useDashboardKpi() {
  const projectInfo: ProjectInfoKpi = {
    cumulativeDays: 0,
    startDate: '—',
    plannedCompletionDate: '—',
  }
  const progress: ProgressKpi = {
    overallPercent: 0,
    plannedProgressPercent: 0,
    actualProgressPercent: 0,
  }
  const budget: BudgetKpi = {
    executedAmount: 0,
    approvedBudget: 0,
    executionRatePercent: 0,
  }
  return {
    projectInfo,
    progress,
    budget,
  }
}
