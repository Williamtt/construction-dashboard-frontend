import { isAxiosError } from 'axios'

/** 從 API／網路錯誤取出可給使用者看的說明（含 HTTP status、後端 error.message） */
export function getApiErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    const data = e.response?.data as { error?: { message?: string; code?: string } } | undefined
    const apiMsg = data?.error?.message?.trim()
    if (apiMsg) return apiMsg
    const status = e.response?.status
    if (status != null) {
      const base = `HTTP ${status}`
      if (e.message && !e.message.startsWith('Request failed')) return `${base} · ${e.message}`
      return status === 404
        ? `${base}（找不到資源或路徑）`
        : `${base}（無詳細訊息，請看 Network 回應內容）`
    }
    if (e.code === 'ERR_NETWORK') return '無法連上伺服器（請確認 VITE_API_URL 與網路）'
    if (e.message) return e.message
    return '請求失敗'
  }
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e.trim()) return e.trim()
  return '發生未知錯誤'
}
