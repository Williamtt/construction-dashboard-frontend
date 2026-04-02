/**
 * 數字千分位與金額顯示（zh-TW：`1,234.56` 形式）。
 * 後端若回傳字串小數，請直接傳入；已含逗號的字串會先去除再解析。
 */

export type FormatThousandsOptions = {
  /** 最少小數位；未指定時為 0 */
  minimumFractionDigits?: number
  /** 最多小數位；未指定時為 20（避免長小數被截斷） */
  maximumFractionDigits?: number
  /** 無法解析為有效數字時顯示 */
  fallback?: string
}

/**
 * 解析為有限數字；無法解析回傳 `null`（不拋錯）。
 * 會略過千分位逗號與空白。
 */
export function parseLocaleNumber(
  value: string | number | bigint | null | undefined
): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'bigint') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  const s = String(value).replace(/,/g, '').replace(/\s/g, '').trim()
  if (s === '' || s === '-' || s === '+') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/**
 * 千分位格式化（核心）。
 */
export function formatThousands(
  value: string | number | bigint | null | undefined,
  options?: FormatThousandsOptions
): string {
  const fallback = options?.fallback ?? '—'
  const n = parseLocaleNumber(value)
  if (n === null) return fallback

  const minimumFractionDigits = options?.minimumFractionDigits ?? 0
  const maximumFractionDigits = options?.maximumFractionDigits ?? 20

  return new Intl.NumberFormat('zh-TW', {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(n)
}

/**
 * 一般金額：千分位，小數 0～2 位（尾隨 0 不強制補滿）。
 */
export function formatMoney(
  value: string | number | bigint | null | undefined,
  options?: Pick<FormatThousandsOptions, 'fallback'>
): string {
  return formatThousands(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    fallback: options?.fallback,
  })
}

/**
 * 金額固定兩位小數（例如帳面新台幣）。
 */
export function formatMoneyFixed2(
  value: string | number | bigint | null | undefined,
  options?: Pick<FormatThousandsOptions, 'fallback'>
): string {
  return formatThousands(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    fallback: options?.fallback,
  })
}

/** 介面顯示用新台幣前綴（輸入框仍請用純數字字串） */
export const TW_DOLLAR_PREFIX = 'NT$'

/**
 * 新台幣金額顯示：`NT$` + 千分位，小數 0～2 位。
 * 無法解析時回傳 `fallback`（預設「—」），不加符號。
 */
export function formatMoneyNtd(
  value: string | number | bigint | null | undefined,
  options?: Pick<FormatThousandsOptions, 'fallback'>
): string {
  const fallback = options?.fallback ?? '—'
  const inner = formatMoney(value, { fallback })
  if (inner === fallback) return fallback
  return `${TW_DOLLAR_PREFIX}\u00A0${inner}`
}

/**
 * 與後端 `Decimal(18,4)` 對齊：單價、複價、數量等工程數值（最多四位小數）。
 */
export function formatEngineeringDecimal(
  value: string | number | bigint | null | undefined,
  options?: Pick<FormatThousandsOptions, 'fallback'>
): string {
  return formatThousands(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
    fallback: options?.fallback,
  })
}

// ── 精確十進位算術（BigInt，對齊後端 Decimal(18,4)）──────────────────────────

/** 字串十進位（最多4位小數）→ bigint（×10^4 整數表示）*/
function decimalStrToBigInt(s: string | number): bigint {
  const clean = String(s).replace(/,/g, '').trim()
  if (!clean || clean === '-' || clean === '+') return 0n
  const neg = clean.startsWith('-')
  const abs = neg ? clean.slice(1) : clean
  const dotIdx = abs.indexOf('.')
  const intPart = dotIdx === -1 ? abs : abs.slice(0, dotIdx)
  const fracPart = dotIdx === -1 ? '' : abs.slice(dotIdx + 1)
  const frac4 = fracPart.padEnd(4, '0').slice(0, 4)
  const result = BigInt(intPart || '0') * 10000n + BigInt(frac4)
  return neg ? -result : result
}

/** bigint（×10^4 整數表示）→ 最多4位小數字串（去尾零）*/
function bigIntToDecimalStr(v: bigint): string {
  const neg = v < 0n
  const abs = neg ? -v : v
  const s = abs.toString().padStart(5, '0')
  const intPart = s.slice(0, -4) || '0'
  const fracPart = s.slice(-4).replace(/0+$/, '')
  const result = fracPart ? `${intPart}.${fracPart}` : intPart
  return neg ? `-${result}` : result
}

/**
 * 精確乘法：a × b，結果保留4位小數（四捨五入），不含浮點誤差。
 * 用於前端顯示金額：數量 × 單價。
 */
export function mulDecimal4(a: string | number, b: string | number): string {
  const ai = decimalStrToBigInt(a)
  const bi = decimalStrToBigInt(b)
  // 兩數各×10^4，乘積×10^8；除以10^4取回4位小數
  const product = ai * bi
  const divisor = 10000n
  const quotient = product / divisor
  const remainder = product % divisor
  const absRem = remainder < 0n ? -remainder : remainder
  const rounded =
    absRem * 2n >= divisor
      ? product < 0n ? quotient - 1n : quotient + 1n
      : quotient
  return bigIntToDecimalStr(rounded)
}

/**
 * 精確加法：a + b，結果保留4位小數，不含浮點誤差。
 * 用於前端顯示金額：本期金額 + 累計金額加總。
 */
export function addDecimal4(a: string | number, b: string | number): string {
  return bigIntToDecimalStr(decimalStrToBigInt(a) + decimalStrToBigInt(b))
}
