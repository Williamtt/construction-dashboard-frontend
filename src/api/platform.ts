import { apiClient } from './client'
import { API_PATH } from '@/constants'
import type {
  ApiResponse,
  PaginatedResponse,
  TenantItem,
  CreateTenantPayload,
  UpdateTenantPayload,
  PlatformProjectItem,
  PlatformUserItem,
} from '@/types'

export type { TenantItem, CreateTenantPayload, UpdateTenantPayload, PlatformProjectItem, PlatformUserItem }

export async function fetchTenants(params?: { page?: number; limit?: number; status?: string }) {
  const { data } = await apiClient.get<PaginatedResponse<TenantItem>>(
    API_PATH.PLATFORM_TENANTS,
    { params }
  )
  return { list: data.data, meta: data.meta }
}

export async function getTenant(id: string) {
  const { data } = await apiClient.get<ApiResponse<TenantItem>>(
    `${API_PATH.PLATFORM_TENANTS}/${id}`
  )
  return data.data
}

export async function createTenant(payload: CreateTenantPayload) {
  const { data } = await apiClient.post<ApiResponse<TenantItem>>(
    API_PATH.PLATFORM_TENANTS,
    payload
  )
  return data.data
}

export async function updateTenant(id: string, payload: UpdateTenantPayload) {
  const { data } = await apiClient.patch<ApiResponse<TenantItem>>(
    `${API_PATH.PLATFORM_TENANTS}/${id}`,
    payload
  )
  return data.data
}

// ---------- 專案總覽 ----------

export async function fetchPlatformProjects(params?: {
  page?: number
  limit?: number
  tenantId?: string
}) {
  const { data } = await apiClient.get<PaginatedResponse<PlatformProjectItem>>(
    API_PATH.PLATFORM_PROJECTS,
    { params }
  )
  return { list: data.data, meta: data.meta }
}

// ---------- 平台使用者（用於租戶帳號列表、重設密碼）----------

export async function fetchPlatformUsers(params?: {
  tenantId?: string
  systemRole?: string
  memberType?: string
  page?: number
  limit?: number
}) {
  const { data } = await apiClient.get<PaginatedResponse<PlatformUserItem>>(
    API_PATH.PLATFORM_USERS,
    { params }
  )
  return { list: data.data, meta: data.meta }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const { data } = await apiClient.patch<ApiResponse<{ ok: boolean }>>(
    `${API_PATH.PLATFORM_USERS}/${userId}/password`,
    { newPassword }
  )
  return data.data
}
