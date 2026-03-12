import { apiClient } from './client'
import { API_PATH } from '@/constants'
import type { ApiResponse } from '@/types'
import type { ProjectDetail, UpdateProjectInfoPayload } from '@/types'
import type { ScheduleAdjustmentRow } from '@/types'

const scheduleAdjustmentsPath = (projectId: string) =>
  `${API_PATH.PROJECTS}/${encodeURIComponent(projectId)}/schedule-adjustments`

/** 取得單一專案（含專案資訊欄位） */
export async function getProject(projectId: string): Promise<ProjectDetail | null> {
  const { data } = await apiClient.get<ApiResponse<ProjectDetail>>(
    `${API_PATH.PROJECTS}/${encodeURIComponent(projectId)}`
  )
  return data.data ?? null
}

/** 更新專案（含專案資訊） */
export async function updateProject(
  projectId: string,
  payload: UpdateProjectInfoPayload
): Promise<ProjectDetail> {
  const { data } = await apiClient.patch<ApiResponse<ProjectDetail>>(
    `${API_PATH.PROJECTS}/${encodeURIComponent(projectId)}`,
    payload
  )
  if (!data.data) throw new Error('更新失敗')
  return data.data
}

/** 取得專案工期調整列表 */
export async function getScheduleAdjustments(projectId: string): Promise<ScheduleAdjustmentRow[]> {
  const { data } = await apiClient.get<ApiResponse<ScheduleAdjustmentRow[]>>(scheduleAdjustmentsPath(projectId))
  return data.data ?? []
}

/** 新增工期調整 */
export async function createScheduleAdjustment(
  projectId: string,
  payload: { applyDate: string; type: string; applyDays: number; approvedDays: number; status?: string }
): Promise<ScheduleAdjustmentRow> {
  const { data } = await apiClient.post<ApiResponse<ScheduleAdjustmentRow>>(
    scheduleAdjustmentsPath(projectId),
    payload
  )
  if (!data.data) throw new Error('新增失敗')
  return data.data
}

/** 更新工期調整 */
export async function updateScheduleAdjustment(
  projectId: string,
  id: string,
  payload: Partial<{ applyDate: string; type: string; applyDays: number; approvedDays: number; status: string }>
): Promise<ScheduleAdjustmentRow> {
  const { data } = await apiClient.patch<ApiResponse<ScheduleAdjustmentRow>>(
    `${scheduleAdjustmentsPath(projectId)}/${encodeURIComponent(id)}`,
    payload
  )
  if (!data.data) throw new Error('更新失敗')
  return data.data
}

/** 刪除工期調整 */
export async function deleteScheduleAdjustment(projectId: string, id: string): Promise<void> {
  await apiClient.delete(`${scheduleAdjustmentsPath(projectId)}/${encodeURIComponent(id)}`)
}
