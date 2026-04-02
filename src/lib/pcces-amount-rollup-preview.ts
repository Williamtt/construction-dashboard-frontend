/**
 * 與後端 `pcces-amount-rollup.ts` 對齊：預覽「變更後數量／單價」套用後的階層複價（含子層加總、非葉單價反算）。
 * 金額計算使用 BigInt 精確十進位算術，避免 IEEE 754 浮點誤差。
 */

import { mulDecimal4 } from '@/lib/format-number'

export type PccesRollupPreviewRow = {
  itemKey: number
  parentItemKey: number | null
  depth: number
  quantity: string
  unitPrice: string
  /** 計算後寫入；呼叫前可為 null */
  amountImported: string | null
}

// ── BigInt 輔助（本地，不對外 export）──────────────────────────────────────

function decimalStrToBigInt(s: string): bigint {
  const clean = s.replace(/,/g, '').trim()
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

function bigIntToDecimalStr(v: bigint): string {
  const neg = v < 0n
  const abs = neg ? -v : v
  const s = abs.toString().padStart(5, '0')
  const intPart = s.slice(0, -4) || '0'
  const fracPart = s.slice(-4).replace(/0+$/, '')
  const result = fracPart ? `${intPart}.${fracPart}` : intPart
  return neg ? `-${result}` : result
}

/** 精確除法（整數÷整數，結果保留4位小數，四捨五入），用於父層單價反算 */
function divDecimal4BigInt(numerator: bigint, denominator: bigint): string {
  if (denominator === 0n) return '0'
  // numerator 已是×10^4，×10^4 再除以 denominator 得4位小數
  const scaled = numerator * 10000n
  const q = scaled / denominator
  const r = scaled % denominator
  const absR = r < 0n ? -r : r
  const absD = denominator < 0n ? -denominator : denominator
  const rounded = absR * 2n >= absD
    ? (scaled < 0n ? q - 1n : q + 1n)
    : q
  return bigIntToDecimalStr(rounded)
}

function parentItemKeysWithChildren(rows: readonly { parentItemKey: number | null }[]): Set<number> {
  const s = new Set<number>()
  for (const r of rows) {
    if (r.parentItemKey != null) s.add(r.parentItemKey)
  }
  return s
}

/**
 * 就地計算每列複價（由最深層往淺層）。
 */
export function applyPccesPreviewRollup(rows: PccesRollupPreviewRow[]): void {
  if (rows.length === 0) return

  const parentsWithChildren = parentItemKeysWithChildren(rows)

  const childrenByParent = new Map<number, PccesRollupPreviewRow[]>()
  for (const r of rows) {
    const pk = r.parentItemKey
    if (pk === null) continue
    const list = childrenByParent.get(pk)
    if (list) list.push(r)
    else childrenByParent.set(pk, [r])
  }

  let maxDepth = 0
  for (const r of rows) {
    if (r.depth > maxDepth) maxDepth = r.depth
  }

  for (let d = maxDepth; d >= 1; d--) {
    for (const r of rows) {
      if (r.depth !== d) continue

      const isLeaf = !parentsWithChildren.has(r.itemKey)
      if (isLeaf) {
        // 葉節點：數量 × 單價（精確乘法）
        r.amountImported = mulDecimal4(r.quantity, r.unitPrice)
        continue
      }

      // 非葉節點：子層複價加總（精確加法）
      const kids = childrenByParent.get(r.itemKey) ?? []
      let sum = 0n
      for (const k of kids) {
        sum += decimalStrToBigInt(k.amountImported ?? '0')
      }
      r.amountImported = bigIntToDecimalStr(sum)

      // 反算父層單價：sum ÷ quantity（精確除法）
      const qBig = decimalStrToBigInt(r.quantity)
      r.unitPrice = qBig !== 0n ? divDecimal4BigInt(sum, qBig) : '0'
    }
  }
}
