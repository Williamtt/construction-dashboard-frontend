/**
 * 進度 S 曲線時間尺度聚合
 * 將後端原始期別（任意粒度）聚合為週 / 月 / 季 / 半年，供前端切換顯示尺度。
 * 僅改變顯示，不影響後端資料。
 */

import type { ProgressPeriodDto, ProgressPlanCurveDto } from '@/types/project-progress'

export type TimeScale = 'raw' | 'week' | 'month' | 'quarter' | 'half'

export const TIME_SCALE_LABELS: Record<TimeScale, string> = {
  raw: '原始',
  week: '週',
  month: '月',
  quarter: '季',
  half: '半年',
}

// ── ISO week 計算（不依賴外部套件）──────────────────────────────────────────

function isoWeekInfo(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { year: date.getUTCFullYear(), week }
}

// ── 桶 key 與標籤 ──────────────────────────────────────────────────────────

function bucketKey(dateStr: string, scale: TimeScale): string {
  const [y, m] = dateStr.split('-').map(Number) as [number, number, number]
  const d = new Date(dateStr + 'T00:00:00')
  if (scale === 'week') {
    const { year, week } = isoWeekInfo(d)
    return `${year}-W${String(week).padStart(2, '0')}`
  }
  if (scale === 'month') return `${y}-${String(m).padStart(2, '0')}`
  if (scale === 'quarter') return `${y}-Q${Math.ceil(m / 3)}`
  if (scale === 'half') return `${y}-H${m <= 6 ? 1 : 2}`
  return dateStr
}

function bucketLabel(key: string, multiYear: boolean): string {
  if (key.includes('-W')) {
    const [yr, w] = key.split('-W') as [string, string]
    return multiYear ? `${yr.slice(2)}/W${w}` : `W${w}`
  }
  if (key.includes('-Q')) {
    const [yr, q] = key.split('-') as [string, string]
    return multiYear ? `${yr.slice(2)}/${q}` : q
  }
  if (key.includes('-H')) {
    const [yr, h] = key.split('-') as [string, string]
    return multiYear ? `${yr.slice(2)}/${h}` : h
  }
  // month: "2025-03"
  const [yr, mo] = key.split('-') as [string, string]
  return multiYear ? `${yr.slice(2)}/${parseInt(mo)}月` : `${parseInt(mo)}月`
}

// ── 聚合邏輯 ────────────────────────────────────────────────────────────────

function sumNullable(values: (string | null | undefined)[]): string | null {
  let total = 0
  let hasAny = false
  for (const v of values) {
    if (v == null || v === '') continue
    const n = Number(String(v).replace(/,/g, ''))
    if (Number.isFinite(n)) { total += n; hasAny = true }
  }
  return hasAny ? String(total) : null
}

function lastNonNull(values: (string | null | undefined)[]): string | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i]
    if (v != null && v !== '') return v
  }
  return null
}

export interface AggregateResult {
  periods: ProgressPeriodDto[]
  planCurves: ProgressPlanCurveDto[]
  /** X 軸顯示標籤（與 periods 同長度），用於取代 shortDate(periodDate) */
  periodLabels: string[]
}

export function aggregateProgressData(
  rawPeriods: ProgressPeriodDto[],
  rawCurves: ProgressPlanCurveDto[],
  scale: TimeScale,
): AggregateResult {
  if (scale === 'raw' || rawPeriods.length === 0) {
    return {
      periods: rawPeriods,
      planCurves: rawCurves,
      periodLabels: rawPeriods.map((p) => {
        const parts = p.periodDate.split('-')
        return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : p.periodDate
      }),
    }
  }

  // 建桶：保留插入順序
  const bucketKeys: string[] = []
  const bucketMap = new Map<string, number[]>() // bucketKey → 原始 period 索引陣列

  for (let i = 0; i < rawPeriods.length; i++) {
    const key = bucketKey(rawPeriods[i]!.periodDate, scale)
    if (!bucketMap.has(key)) {
      bucketMap.set(key, [])
      bucketKeys.push(key)
    }
    bucketMap.get(key)!.push(i)
  }

  const multiYear = new Set(bucketKeys.map((k) => k.slice(0, 4))).size > 1

  // 聚合 periods
  const aggPeriods: ProgressPeriodDto[] = []
  for (const key of bucketKeys) {
    const indices = bucketMap.get(key)!
    const group = indices.map((i) => rawPeriods[i]!)
    const last = group[group.length - 1]!
    aggPeriods.push({
      periodDate: last.periodDate,
      periodIndex: last.periodIndex,
      periodPlanned: sumNullable(group.map((p) => p.periodPlanned)),
      cumulativePlanned: last.cumulativePlanned,
      periodPlannedCompare: sumNullable(group.map((p) => p.periodPlannedCompare)),
      cumulativePlannedCompare: last.cumulativePlannedCompare ?? null,
      periodActual: sumNullable(group.map((p) => p.periodActual)),
      cumulativeActual: last.cumulativeActual,
      isLocked: group.some((p) => p.isLocked),
      isExtended: group.some((p) => p.isExtended),
    })
  }

  // 聚合 planCurves：每桶取最後一個非 null 的 cumulativePlanned
  const aggCurves: ProgressPlanCurveDto[] = rawCurves.map((curve) => ({
    ...curve,
    cumulativePlanned: bucketKeys.map((key) => {
      const indices = bucketMap.get(key)!
      return lastNonNull(indices.map((i) => curve.cumulativePlanned[i] ?? null))
    }),
  }))

  const periodLabels = bucketKeys.map((key) => bucketLabel(key, multiYear))

  return { periods: aggPeriods, planCurves: aggCurves, periodLabels }
}
