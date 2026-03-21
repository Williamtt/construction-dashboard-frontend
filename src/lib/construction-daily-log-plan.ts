/**
 * 與後端 `computePlannedProgressPercent` 對齊：依開工日＋核定工期線性推算預定進度（%）。
 */
export function computePlannedProgressPreview(
  logDate: string,
  startDate: string | null,
  approvedDurationDays: number | null | undefined
): number | null {
  if (!startDate || approvedDurationDays == null || approvedDurationDays <= 0) return null
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(Date.UTC(y, m - 1, d))
  }
  const start = parse(startDate)
  const log = parse(logDate)
  if (!start || !log) return null
  const ua = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  const ub = Date.UTC(log.getUTCFullYear(), log.getUTCMonth(), log.getUTCDate())
  const elapsed = Math.max(0, Math.floor((ub - ua) / 86400000) + 1)
  if (elapsed === 0) return 0
  const raw = (elapsed / approvedDurationDays) * 100
  return Math.round(Math.min(100, Math.max(0, raw)) * 100) / 100
}
