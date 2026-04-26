import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getProject } from '@/api/project'
import { getProgressDashboard } from '@/api/project-progress'
import { getConstructionValuationListSummary } from '@/api/construction-valuations'
import type { ProjectInfoKpi, ProgressKpi, BudgetKpi } from '@/types/dashboard'
import type { ProgressPeriodDto } from '@/types/project-progress'

const DEFAULT_PROJECT_INFO: ProjectInfoKpi = {
  cumulativeDays: 0,
  startDate: '—',
  plannedCompletionDate: '—',
}

function formatDateDisplay(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/** 從 periods 提取今日計畫進度與最新實際進度（0–100） */
function extractProgressKpi(periods: ProgressPeriodDto[]): { planned: number; actual: number } {
  if (!periods.length) return { planned: 0, actual: 0 }
  const today = new Date().toISOString().slice(0, 10)
  let planned = 0
  let actual = 0
  for (const p of periods) {
    if (p.periodDate <= today) {
      const v = parseFloat(p.cumulativePlanned)
      if (!isNaN(v)) planned = v
    }
    const a = parseFloat(p.cumulativeActual)
    if (!isNaN(a) && a > 0) actual = a
  }
  return { planned, actual }
}

/** 從開工日到今天的累積天數（含今天）；若未開工或無 startDate 則為 0 */
function computeCumulativeDays(startDateIso: string | null): number {
  if (!startDateIso) return 0
  const start = new Date(startDateIso)
  if (Number.isNaN(start.getTime())) return 0
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - start.getTime()
  if (diffMs < 0) return 0
  return Math.floor(diffMs / (24 * 60 * 60 * 1000))
}

export function useDashboardKpi() {
  const route = useRoute()
  const projectInfo = ref<ProjectInfoKpi>({ ...DEFAULT_PROJECT_INFO })
  const progress = ref<ProgressKpi>({ overallPercent: 0, plannedProgressPercent: 0, actualProgressPercent: 0 })
  const budget = ref<BudgetKpi>({ executedAmount: 0, approvedBudget: 0, executionRatePercent: 0 })

  const projectId = computed(() => route.params.projectId as string | undefined)

  async function loadProjectInfo(id: string) {
    try {
      const project = await getProject(id)
      if (!project) {
        projectInfo.value = { ...DEFAULT_PROJECT_INFO }
        return
      }
      // 預定竣工：以工期調整後（revisedEndDate）為準，無則用原訂（plannedEndDate）
      const effectivePlannedEnd = project.revisedEndDate ?? project.plannedEndDate
      projectInfo.value = {
        cumulativeDays: computeCumulativeDays(project.startDate),
        startDate: formatDateDisplay(project.startDate),
        plannedCompletionDate: formatDateDisplay(effectivePlannedEnd),
      }

      // 核定預算：原契約工程費 + 設計相關費，轉億元
      const rawApproved =
        parseFloat(project.originalContractAmount ?? '0') +
        parseFloat(project.designFee ?? '0')
      const approvedBudget = isNaN(rawApproved) ? 0 : rawApproved / 1e8

      // 並行取進度與估驗資料，任一失敗不影響另一筆
      const [progressResult, valuationResult] = await Promise.allSettled([
        getProgressDashboard(id),
        getConstructionValuationListSummary(id),
      ])

      if (progressResult.status === 'fulfilled') {
        const { planned, actual } = extractProgressKpi(progressResult.value.periods)
        progress.value = {
          overallPercent: actual,
          plannedProgressPercent: Math.round(planned * 10) / 10,
          actualProgressPercent: Math.round(actual * 10) / 10,
        }
      }

      if (valuationResult.status === 'fulfilled') {
        const executedAmount = parseFloat(valuationResult.value.billedAmountTotal) / 1e8
        const safeExecuted = isNaN(executedAmount) ? 0 : executedAmount
        const executionRatePercent =
          approvedBudget > 0 ? Math.round((safeExecuted / approvedBudget) * 1000) / 10 : 0
        budget.value = {
          approvedBudget: Math.round(approvedBudget * 10) / 10,
          executedAmount: Math.round(safeExecuted * 10) / 10,
          executionRatePercent,
        }
      } else if (approvedBudget > 0) {
        // 估驗尚無資料，仍顯示核定金額
        budget.value = {
          approvedBudget: Math.round(approvedBudget * 10) / 10,
          executedAmount: 0,
          executionRatePercent: 0,
        }
      }
    } catch {
      projectInfo.value = { ...DEFAULT_PROJECT_INFO }
    }
  }

  watch(projectId, (id) => {
    if (id) {
      loadProjectInfo(id)
    } else {
      projectInfo.value = { ...DEFAULT_PROJECT_INFO }
      progress.value = { overallPercent: 0, plannedProgressPercent: 0, actualProgressPercent: 0 }
      budget.value = { executedAmount: 0, approvedBudget: 0, executionRatePercent: 0 }
    }
  }, { immediate: true })

  onMounted(() => {
    if (projectId.value) loadProjectInfo(projectId.value)
  })

  return {
    projectInfo,
    progress,
    budget,
  }
}
