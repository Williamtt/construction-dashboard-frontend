import { apiClient } from './client'
import { API_PATH } from '@/constants'
import type { ApiResponse, PaginatedResponse } from '@/types'

export interface SubmitApplicationPayload {
  email: string
  password: string
  name: string
  studentId?: string
  department?: string
  tenantId: string
}

export interface ApplicationItem {
  id: string
  email: string
  name: string
  studentId: string | null
  department: string | null
  status: 'pending' | 'approved' | 'rejected'
  tenantId: string
  reviewedById: string | null
  reviewedAt: string | null
  rejectReason: string | null
  createdAt: string
  updatedAt: string
}

/** 學生申請帳號（公開，不需登入） */
export async function submitApplication(payload: SubmitApplicationPayload) {
  const { data } = await apiClient.post<ApiResponse<{ message: string }>>(
    API_PATH.AUTH_APPLY,
    payload
  )
  return data.data
}

/** 管理員：取得申請清單 */
export async function getApplications(params: {
  status?: string
  page?: number
  limit?: number
}) {
  const { data } = await apiClient.get<PaginatedResponse<ApplicationItem>>(
    API_PATH.ADMIN_APPLICATIONS,
    { params }
  )
  return data
}

/** 管理員：取得單筆申請 */
export async function getApplication(id: string) {
  const { data } = await apiClient.get<ApiResponse<ApplicationItem>>(
    API_PATH.ADMIN_APPLICATION(id)
  )
  return data.data
}

/** 管理員：核准 */
export async function approveApplication(id: string) {
  const { data } = await apiClient.patch<
    ApiResponse<{ userId: string; email: string; message: string }>
  >(API_PATH.ADMIN_APPLICATION_APPROVE(id))
  return data.data
}

/** 管理員：拒絕 */
export async function rejectApplication(id: string, rejectReason: string) {
  const { data } = await apiClient.patch<ApiResponse<{ ok: true }>>(
    API_PATH.ADMIN_APPLICATION_REJECT(id),
    { rejectReason }
  )
  return data.data
}
