import type { ProjectInfoKpi, ProgressKpi, BudgetKpi } from '@/types/dashboard'

/** 儀表板 KPI 假資料（Phase 3），之後可改為 API */
const MOCK_PROJECT_INFO: ProjectInfoKpi = {
  cumulativeDays: 297,
  startDate: '2025/01/15',
  plannedCompletionDate: '2026/12/31',
}

const MOCK_PROGRESS: ProgressKpi = {
  overallPercent: 52,
  plannedProgressPercent: 52,
  actualProgressPercent: 50,
}

const MOCK_BUDGET: BudgetKpi = {
  executedAmount: 45.8,
  approvedBudget: 86.0,
  executionRatePercent: 53.3,
}

export function useDashboardKpi() {
  return {
    projectInfo: MOCK_PROJECT_INFO,
    progress: MOCK_PROGRESS,
    budget: MOCK_BUDGET,
  }
}
