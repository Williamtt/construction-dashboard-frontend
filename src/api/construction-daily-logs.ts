import { apiClient } from './client'
import { API_PATH } from '@/constants/api'
import type { ApiResponse } from '@/types/api'

export interface ConstructionDailyLogWorkItemDto {
  id?: string
  pccesItemId?: string | null
  /** PCCES 項次；手填列為 null */
  itemNo?: string | null
  workItemName: string
  unit: string
  contractQty: string
  dailyQty: string
  accumulatedQty: string
  remark: string
}

export interface ConstructionDailyLogMaterialDto {
  id?: string
  materialName: string
  unit: string
  contractQty: string
  dailyUsedQty: string
  accumulatedQty: string
  remark: string
}

export interface ConstructionDailyLogPersonnelEquipmentDto {
  id?: string
  workType: string
  dailyWorkers: number
  accumulatedWorkers: number
  equipmentName: string
  dailyEquipmentQty: string
  accumulatedEquipmentQty: string
}

export interface ConstructionDailyLogDto {
  id: string
  projectId: string
  reportNo: string | null
  weatherAm: string | null
  weatherPm: string | null
  logDate: string
  projectName: string
  contractorName: string
  approvedDurationDays: number | null
  accumulatedDays: number | null
  remainingDays: number | null
  extendedDays: number | null
  startDate: string | null
  completionDate: string | null
  plannedProgress: number | null
  actualProgress: string | null
  specialItemA: string
  specialItemB: string
  hasTechnician: boolean
  preWorkEducation: string
  newWorkerInsurance: string
  ppeCheck: string
  otherSafetyNotes: string
  sampleTestRecord: string
  subcontractorNotice: string
  importantNotes: string
  siteManagerSigned: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  workItems: ConstructionDailyLogWorkItemDto[]
  materials: ConstructionDailyLogMaterialDto[]
  personnelEquipmentRows: ConstructionDailyLogPersonnelEquipmentDto[]
}

export interface ConstructionDailyLogListItemDto {
  id: string
  logDate: string
  reportNo: string | null
  weatherAm: string | null
  weatherPm: string | null
  projectName: string
  plannedProgress: number | null
  actualProgress: string | null
  createdAt: string
}

export interface ConstructionDailyLogFormDefaults {
  projectName: string
  contractorName: string
  startDate: string | null
  approvedDurationDays: number | null
}

export type ConstructionDailyLogUpsertPayload = Omit<
  ConstructionDailyLogDto,
  | 'id'
  | 'projectId'
  | 'plannedProgress'
  | 'createdById'
  | 'createdAt'
  | 'updatedAt'
  | 'workItems'
  | 'materials'
  | 'personnelEquipmentRows'
  | 'actualProgress'
> & {
  actualProgress: number | null
  workItems: Omit<ConstructionDailyLogWorkItemDto, 'id'>[]
  materials: Omit<ConstructionDailyLogMaterialDto, 'id'>[]
  personnelEquipmentRows: Omit<ConstructionDailyLogPersonnelEquipmentDto, 'id'>[]
}

export async function listConstructionDailyLogs(
  projectId: string,
  params: { page?: number; limit?: number }
): Promise<{ list: ConstructionDailyLogListItemDto[]; meta: { page: number; limit: number; total: number } }> {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  const q = search.toString()
  const url = `${API_PATH.PROJECT_CONSTRUCTION_DAILY_LOGS(projectId)}${q ? `?${q}` : ''}`
  const { data: body } = await apiClient.get<
    ApiResponse<ConstructionDailyLogListItemDto[]>
  >(url)
  const meta = body.meta
  if (!meta?.page || !meta.limit || meta.total === undefined) {
    throw new Error('Invalid list response')
  }
  return { list: body.data, meta: { page: meta.page, limit: meta.limit, total: meta.total } }
}

export async function getConstructionDailyLogDefaults(
  projectId: string
): Promise<ConstructionDailyLogFormDefaults> {
  const { data } = await apiClient.get<ApiResponse<ConstructionDailyLogFormDefaults>>(
    API_PATH.PROJECT_CONSTRUCTION_DAILY_LOG_DEFAULTS(projectId)
  )
  return data.data
}

export interface ConstructionDailyLogPccesPickerImport {
  id: string
  version: number
  approvedAt: string | null
  approvedById: string | null
}

export interface ConstructionDailyLogPccesPickerItem {
  pccesItemId: string
  itemNo: string
  workItemName: string
  unit: string
  contractQty: string
  /** 填表日期之前、其他日誌已填本日量加總 */
  priorAccumulatedQty: string
}

/** 父層僅供對照（單位與子項不同，不填數量）；僅當該父下至少有一筆 general 子項時出現 */
export interface ConstructionDailyLogPccesPickerGroup {
  parent: { itemNo: string; workItemName: string; unit: string } | null
  children: ConstructionDailyLogPccesPickerItem[]
}

export interface ConstructionDailyLogPccesPickerResponse {
  pccesImport: ConstructionDailyLogPccesPickerImport | null
  /** 依父層分組；無父層之 general 列會落在 parent 為 null 的群組 */
  groups: ConstructionDailyLogPccesPickerGroup[]
  /** 所有可填數量之子列（扁平，與後端驗證用 id 清單一致） */
  items: ConstructionDailyLogPccesPickerItem[]
}

export async function getConstructionDailyLogPccesWorkItems(
  projectId: string,
  params: { logDate: string; excludeLogId?: string }
): Promise<ConstructionDailyLogPccesPickerResponse> {
  const search = new URLSearchParams()
  search.set('logDate', params.logDate)
  if (params.excludeLogId) search.set('excludeLogId', params.excludeLogId)
  const url = `${API_PATH.PROJECT_CONSTRUCTION_DAILY_LOG_PCCES_WORK_ITEMS(projectId)}?${search}`
  const { data } = await apiClient.get<ApiResponse<ConstructionDailyLogPccesPickerResponse>>(url)
  return data.data
}

export async function getConstructionDailyLog(
  projectId: string,
  logId: string
): Promise<ConstructionDailyLogDto> {
  const { data } = await apiClient.get<ApiResponse<ConstructionDailyLogDto>>(
    API_PATH.PROJECT_CONSTRUCTION_DAILY_LOG(projectId, logId)
  )
  return data.data
}

export async function createConstructionDailyLog(
  projectId: string,
  payload: ConstructionDailyLogUpsertPayload
): Promise<ConstructionDailyLogDto> {
  const { data } = await apiClient.post<ApiResponse<ConstructionDailyLogDto>>(
    API_PATH.PROJECT_CONSTRUCTION_DAILY_LOGS(projectId),
    payload
  )
  return data.data
}

export async function updateConstructionDailyLog(
  projectId: string,
  logId: string,
  payload: ConstructionDailyLogUpsertPayload
): Promise<ConstructionDailyLogDto> {
  const { data } = await apiClient.patch<ApiResponse<ConstructionDailyLogDto>>(
    API_PATH.PROJECT_CONSTRUCTION_DAILY_LOG(projectId, logId),
    payload
  )
  return data.data
}

export async function deleteConstructionDailyLog(projectId: string, logId: string): Promise<void> {
  await apiClient.delete<ApiResponse<{ ok: boolean }>>(
    API_PATH.PROJECT_CONSTRUCTION_DAILY_LOG(projectId, logId)
  )
}
