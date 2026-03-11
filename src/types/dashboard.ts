/**
 * 儀表板相關型別：KPI、警報、環境數據、圖表等
 */

/** 專案資訊 KPI */
export interface ProjectInfoKpi {
  cumulativeDays: number
  startDate: string
  plannedCompletionDate: string
}

/** 整體進度 KPI */
export interface ProgressKpi {
  overallPercent: number
  plannedProgressPercent: number
  actualProgressPercent: number
}

/** 預算執行 KPI */
export interface BudgetKpi {
  executedAmount: number
  approvedBudget: number
  executionRatePercent: number
}

/** 警報等級 */
export type AlertLevel = 'alarm' | 'attention' | 'normal'

/** 警報項目 */
export interface AlertItem {
  id: string
  level: AlertLevel
  title: string
  value: string
  description?: string
  suggestion?: string
}

/** 環境監測單項 */
export interface EnvironmentMetric {
  key: string
  label: string
  value: number | string
  unit: string
}

/** 圖表 series 單一筆（供 vue-echarts） */
export interface ChartSeriesItem {
  name: string
  type: string
  data: (number | [string, number])[]
}
