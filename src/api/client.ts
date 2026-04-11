import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { useAdminStore } from '@/stores/admin'

const baseURL = import.meta.env.VITE_API_URL ?? ''

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const auth = useAuthStore()
  const token = auth.accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // 預設 Content-Type: application/json 不可蓋掉 multipart boundary；FormData 務必讓瀏覽器自帶 boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers
    if (h && typeof (h as { delete?: (k: string) => void }).delete === 'function') {
      ;(h as { delete: (k: string) => void }).delete('Content-Type')
    } else if (h && typeof h === 'object' && 'Content-Type' in h) {
      delete (h as Record<string, unknown>)['Content-Type']
    }
  }
  return config
})

/** 防止 refresh 流程中再度觸發自身（避免無限遞迴） */
let isRefreshing = false
/** refresh 進行中等待的請求佇列 */
let pendingQueue: Array<(token: string) => void> = []

function drainQueue(newToken: string) {
  pendingQueue.forEach((cb) => cb(newToken))
  pendingQueue = []
}

function forceLogout() {
  const auth = useAuthStore()
  const adminStore = useAdminStore()
  auth.clearAuth()
  adminStore.clearSelectedTenantId()
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // 維護模式：503 + code MAINTENANCE 時保留 API 回傳訊息供畫面顯示
    if (error.response?.status === 503 && error.response?.data?.error?.code === 'MAINTENANCE') {
      error.message = error.response?.data?.error?.message ?? '系統維護中，請稍後再試。'
      return Promise.reject(error)
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & { _retried?: boolean }

    // 僅在已登入、收到 401、且尚未重試過才嘗試 refresh
    if (error.response?.status === 401 && !originalRequest._retried) {
      const auth = useAuthStore()
      const storedRefresh = auth.refreshToken

      // 無 refresh token（未登入或已清除）→ 直接登出
      if (!storedRefresh) {
        forceLogout()
        return Promise.reject(error)
      }

      // refresh 端點本身 401 → 避免遞迴，直接登出
      if (typeof originalRequest.url === 'string' && originalRequest.url.includes('/auth/refresh')) {
        forceLogout()
        return Promise.reject(error)
      }

      originalRequest._retried = true

      if (isRefreshing) {
        // 其他請求也在等 refresh，加入佇列等新 token
        return new Promise<string>((resolve) => {
          pendingQueue.push(resolve)
        }).then((newToken) => {
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`
          return apiClient(originalRequest)
        })
      }

      isRefreshing = true
      try {
        const { data } = await apiClient.post<{
          data: { accessToken: string; refreshToken: string }
        }>('/api/v1/auth/refresh', { refreshToken: storedRefresh })
        const { accessToken: newAccess, refreshToken: newRefresh } = data.data
        auth.setToken(newAccess)
        auth.setRefreshToken(newRefresh)
        drainQueue(newAccess)
        originalRequest.headers = originalRequest.headers ?? {}
        originalRequest.headers['Authorization'] = `Bearer ${newAccess}`
        return apiClient(originalRequest)
      } catch {
        pendingQueue = []
        forceLogout()
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
