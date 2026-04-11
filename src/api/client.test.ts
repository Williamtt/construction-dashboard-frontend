/**
 * Interceptor 測試策略：
 * - client.ts 有模組層級的 `isRefreshing` 狀態，測試間若共享會互相污染
 * - 每個 describe block 用 `vi.resetModules()` + 動態 import 取得全新模組實例
 * - vi.mock() 是全局宣告（vitest 自動提升），resetModules 後重新 import 仍可使用 mock
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import AxiosMockAdapter from 'axios-mock-adapter'
import type { AxiosInstance } from 'axios'

vi.mock('@/stores/projectPermissions', () => ({
  useProjectPermissionsStore: () => ({ clearAll: vi.fn() }),
}))
vi.mock('@/stores/admin', () => ({
  useAdminStore: () => ({ clearSelectedTenantId: vi.fn() }),
}))

// window.location 防止 jsdom 在 href 寫入時拋錯
Object.defineProperty(window, 'location', {
  value: { href: '', pathname: '/dashboard' },
  writable: true,
})

async function freshClient() {
  vi.resetModules()
  const { apiClient } = await import('./client')
  return apiClient as AxiosInstance
}

// ─────────────────────────────────────────────────────────────
// 無 refreshToken → 直接清除 auth
// ─────────────────────────────────────────────────────────────
describe('401 interceptor — 無 refreshToken', () => {
  let apiClient: AxiosInstance
  let mock: AxiosMockAdapter

  beforeEach(async () => {
    setActivePinia(createPinia())
    // localStorage 由 test-setup.ts 統一清空
    apiClient = await freshClient()
    mock = new AxiosMockAdapter(apiClient)
  })
  afterEach(() => mock.restore())

  it('沒有 refreshToken 時直接清除 auth，不呼叫 refresh 端點', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setToken('some-access') // 無 refresh token

    mock.onGet('/api/v1/projects').replyOnce(401)

    await expect(apiClient.get('/api/v1/projects')).rejects.toThrow()

    expect(auth.accessToken).toBeNull()
    expect(mock.history.post ?? []).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────
// refresh 成功 → 更新 token 並完成重試
// ─────────────────────────────────────────────────────────────
describe('401 interceptor — refresh 成功', () => {
  let apiClient: AxiosInstance
  let mock: AxiosMockAdapter

  beforeEach(async () => {
    setActivePinia(createPinia())
    // localStorage 由 test-setup.ts 統一清空
    apiClient = await freshClient()
    mock = new AxiosMockAdapter(apiClient)
  })
  afterEach(() => mock.restore())

  it('refresh 成功後更新 store 內的 token', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setAuth(
      'expired-token',
      { id: 'u1', email: 'a@b.com', systemRole: 'project_user', tenantId: null },
      'valid-refresh'
    )

    // 第一次 GET → 401
    mock.onGet('/api/v1/projects').replyOnce(401)
    // refresh → 成功
    mock.onPost('/api/v1/auth/refresh').replyOnce(200, {
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    })
    // 重試 → 成功
    mock.onGet('/api/v1/projects').replyOnce(200, { data: [] })

    const res = await apiClient.get('/api/v1/projects')

    expect(res.status).toBe(200)
    expect(auth.accessToken).toBe('new-access')
    expect(auth.refreshToken).toBe('new-refresh')
  })
})

// ─────────────────────────────────────────────────────────────
// refresh 失敗 → 清除 auth
// ─────────────────────────────────────────────────────────────
describe('401 interceptor — refresh 失敗', () => {
  let apiClient: AxiosInstance
  let mock: AxiosMockAdapter

  beforeEach(async () => {
    setActivePinia(createPinia())
    // localStorage 由 test-setup.ts 統一清空
    apiClient = await freshClient()
    mock = new AxiosMockAdapter(apiClient)
  })
  afterEach(() => mock.restore())

  it('refresh 失敗時清除 auth', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setAuth(
      'expired-token',
      { id: 'u1', email: 'a@b.com', systemRole: 'project_user', tenantId: null },
      'bad-refresh'
    )

    mock.onGet('/api/v1/projects').replyOnce(401)
    mock.onPost('/api/v1/auth/refresh').replyOnce(401)

    await expect(apiClient.get('/api/v1/projects')).rejects.toThrow()

    expect(auth.accessToken).toBeNull()
    expect(auth.refreshToken).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────
// refresh 端點本身 401 → 不遞迴
// ─────────────────────────────────────────────────────────────
describe('401 interceptor — refresh 端點本身 401', () => {
  let apiClient: AxiosInstance
  let mock: AxiosMockAdapter

  beforeEach(async () => {
    setActivePinia(createPinia())
    // localStorage 由 test-setup.ts 統一清空
    apiClient = await freshClient()
    mock = new AxiosMockAdapter(apiClient)
  })
  afterEach(() => mock.restore())

  it('refresh 端點 401 時直接清除 auth，不遞迴觸發第二次 refresh', async () => {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    auth.setAuth(
      'tok',
      { id: 'u1', email: 'a@b.com', systemRole: 'project_user', tenantId: null },
      'rf'
    )

    mock.onGet('/api/v1/projects').replyOnce(401)
    mock.onPost('/api/v1/auth/refresh').reply(401) // 永遠 401

    await expect(apiClient.get('/api/v1/projects')).rejects.toThrow()

    expect(auth.accessToken).toBeNull()
    // refresh 只被呼叫一次（不遞迴）
    const refreshCalls = (mock.history.post ?? []).filter((r) =>
      r.url?.includes('/auth/refresh')
    )
    expect(refreshCalls).toHaveLength(1)
  })
})

// ─────────────────────────────────────────────────────────────
// 正常 200 不受影響
// ─────────────────────────────────────────────────────────────
describe('正常請求不受 interceptor 影響', () => {
  let apiClient: AxiosInstance
  let mock: AxiosMockAdapter

  beforeEach(async () => {
    setActivePinia(createPinia())
    // localStorage 由 test-setup.ts 統一清空
    apiClient = await freshClient()
    mock = new AxiosMockAdapter(apiClient)
  })
  afterEach(() => mock.restore())

  it('200 回應直接通過，不觸發 refresh', async () => {
    mock.onGet('/api/v1/projects').replyOnce(200, { data: [] })

    const res = await apiClient.get('/api/v1/projects')

    expect(res.status).toBe(200)
    expect(mock.history.post ?? []).toHaveLength(0)
  })
})
