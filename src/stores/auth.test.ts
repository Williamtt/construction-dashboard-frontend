import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'

// mock projectPermissions store（clearAll 被 clearAuth 呼叫）
vi.mock('./projectPermissions', () => ({
  useProjectPermissionsStore: () => ({ clearAll: vi.fn() }),
}))

const mockUser = {
  id: 'u1',
  email: 'test@example.com',
  name: 'Test User',
  systemRole: 'tenant_admin' as const,
  tenantId: 'tenant-1',
}

beforeEach(() => {
  setActivePinia(createPinia())
  // localStorage 由 test-setup.ts 的 beforeEach 統一清空
})

describe('setAuth', () => {
  it('將 accessToken 與 user 存入 store 和 localStorage', () => {
    const auth = useAuthStore()
    auth.setAuth('access-abc', mockUser)

    expect(auth.accessToken).toBe('access-abc')
    expect(auth.user).toEqual(mockUser)
    expect(localStorage.getItem('construction_dashboard_access_token')).toBe('access-abc')
    expect(JSON.parse(localStorage.getItem('construction_dashboard_user')!)).toEqual(mockUser)
  })

  it('傳入 refreshToken 時一並存入 store 和 localStorage', () => {
    const auth = useAuthStore()
    auth.setAuth('access-abc', mockUser, 'refresh-xyz')

    expect(auth.refreshToken).toBe('refresh-xyz')
    expect(localStorage.getItem('construction_dashboard_refresh_token')).toBe('refresh-xyz')
  })

  it('未傳 refreshToken 時不覆蓋既有 refreshToken', () => {
    const auth = useAuthStore()
    auth.setRefreshToken('old-refresh')
    auth.setAuth('access-abc', mockUser) // 不帶 refresh

    expect(auth.refreshToken).toBe('old-refresh')
  })
})

describe('setRefreshToken', () => {
  it('更新 store 和 localStorage', () => {
    const auth = useAuthStore()
    auth.setRefreshToken('rf-token-1')

    expect(auth.refreshToken).toBe('rf-token-1')
    expect(localStorage.getItem('construction_dashboard_refresh_token')).toBe('rf-token-1')
  })
})

describe('clearAuth', () => {
  it('清除 store 中的所有 token 和 user', () => {
    const auth = useAuthStore()
    auth.setAuth('access-abc', mockUser, 'refresh-xyz')
    auth.clearAuth()

    expect(auth.accessToken).toBeNull()
    expect(auth.refreshToken).toBeNull()
    expect(auth.user).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
  })

  it('清除 localStorage 中的所有 token 和 user', () => {
    const auth = useAuthStore()
    auth.setAuth('access-abc', mockUser, 'refresh-xyz')
    auth.clearAuth()

    expect(localStorage.getItem('construction_dashboard_access_token')).toBeNull()
    expect(localStorage.getItem('construction_dashboard_refresh_token')).toBeNull()
    expect(localStorage.getItem('construction_dashboard_user')).toBeNull()
  })
})

describe('localStorage 初始化', () => {
  it('啟動時從 localStorage 讀取 accessToken', () => {
    localStorage.setItem('construction_dashboard_access_token', 'persisted-token')

    // 重新建立 pinia，模擬頁面重整
    setActivePinia(createPinia())
    const auth = useAuthStore()
    expect(auth.accessToken).toBe('persisted-token')
    expect(auth.isAuthenticated).toBe(true)
  })

  it('啟動時從 localStorage 讀取 refreshToken', () => {
    localStorage.setItem('construction_dashboard_refresh_token', 'persisted-refresh')

    setActivePinia(createPinia())
    const auth = useAuthStore()
    expect(auth.refreshToken).toBe('persisted-refresh')
  })
})
