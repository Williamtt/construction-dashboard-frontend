import { apiClient } from './client'
import { API_PATH } from '@/constants/api'
import type { ApiResponse } from '@/types/api'

export interface SupervisionReportInspectionDto {
  id?: string
  category: 'random_check' | 'civil' | 'mep' | 'deficiency'
  description: string
}

export interface SupervisionReportMaterialCheckDto {
  id?: string
  category: 'incoming' | 'secondary' | 'joint'
  description: string
  referenceNo: string
}

export interface SupervisionReportWorkItemDto {
  id?: string
  pccesItemId?: string | null
  itemNo?: string | null
  pccesItemKind?: string | null
  workItemName: string
  unit: string
  contractQty: string
  dailyCompletedQty: string
  accumulatedCompletedQty: string
  remark: string
}

export interface SupervisionReportDto {
  id: string
  projectId: string
  reportNo: string | null
  weatherAm: string | null
  weatherPm: string | null
  reportDate: string
  projectName: string
  contractDuration: number | null
  startDate: string | null
  plannedCompletionDate: string | null
  actualCompletionDate: string | null
  contractChangeCount: number | null
  extensionDays: number | null
  originalContractAmount: string | null
  designFee: string | null
  contractTotal: string | null
  constructionPlannedProgress: string | null
  constructionActualProgress: string | null
  overallPlannedProgress: string | null
  overallActualProgress: string | null
  inspectionNotes: string
  materialQualityNotes: string
  preWorkCheckCompleted: boolean
  safetyNotes: string
  otherSupervisionNotes: string
  supervisorSigned: boolean
  createdById: string
  createdAt: string
  updatedAt: string
  inspections: SupervisionReportInspectionDto[]
  materialChecks: SupervisionReportMaterialCheckDto[]
  workItems: SupervisionReportWorkItemDto[]
}

export interface SupervisionReportListItemDto {
  id: string
  reportDate: string
  reportNo: string | null
  weatherAm: string | null
  weatherPm: string | null
  projectName: string
  constructionPlannedProgress: string | null
  constructionActualProgress: string | null
  overallPlannedProgress: string | null
  overallActualProgress: string | null
  createdAt: string
}

export interface SupervisionReportFormDefaults {
  projectName: string
  contractorName: string
  supervisionUnit: string
  startDate: string | null
  contractDuration: number | null
  plannedCompletionDate: string | null
  extensionDays: number
  contractChangeCount: number
  constructionPlannedProgress: string | null
  originalContractAmount: string | null
  designFee: string | null
  contractTotal: string | null
}

export type SupervisionReportUpsertPayload = {
  reportNo?: string | null
  weatherAm?: string | null
  weatherPm?: string | null
  reportDate: string
  projectName: string
  contractDuration?: number | null
  startDate?: string | null
  plannedCompletionDate?: string | null
  actualCompletionDate?: string | null
  contractChangeCount?: number | null
  extensionDays?: number | null
  originalContractAmount?: string | null
  designFee?: string | null
  contractTotal?: string | null
  constructionPlannedProgress?: number | null
  constructionActualProgress?: number | null
  overallPlannedProgress?: number | null
  overallActualProgress?: number | null
  inspectionNotes: string
  materialQualityNotes: string
  preWorkCheckCompleted: boolean
  safetyNotes: string
  otherSupervisionNotes: string
  supervisorSigned: boolean
  inspections: Omit<SupervisionReportInspectionDto, 'id'>[]
  materialChecks: Omit<SupervisionReportMaterialCheckDto, 'id'>[]
  workItems: Omit<SupervisionReportWorkItemDto, 'id'>[]
}

export interface SupervisionReportPccesPickerRow {
  pccesItemId: string
  itemKey: number
  parentItemKey: number | null
  itemNo: string
  itemKind: string
  workItemName: string
  unit: string
  contractQty: string
  unitPrice: string
  isStructuralLeaf: boolean
  priorAccumulatedQty: string | null
}

export interface SupervisionReportPccesPickerResponse {
  pccesImport: { id: string; version: number } | null
  items: SupervisionReportPccesPickerRow[]
}

export async function listSupervisionReports(
  projectId: string,
  params: { page?: number; limit?: number }
): Promise<{
  list: SupervisionReportListItemDto[]
  meta: { page: number; limit: number; total: number }
}> {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  const q = search.toString()
  const url = `${API_PATH.PROJECT_SUPERVISION_REPORTS(projectId)}${q ? `?${q}` : ''}`
  const { data: body } = await apiClient.get<ApiResponse<SupervisionReportListItemDto[]>>(url)
  const meta = body.meta
  if (!meta?.page || !meta.limit || meta.total === undefined) {
    throw new Error('Invalid list response')
  }
  return { list: body.data, meta: { page: meta.page, limit: meta.limit, total: meta.total } }
}

export async function getSupervisionReportDefaults(
  projectId: string,
  reportDate?: string
): Promise<SupervisionReportFormDefaults> {
  const q = reportDate ? `?reportDate=${reportDate}` : ''
  const url = `${API_PATH.PROJECT_SUPERVISION_REPORT_DEFAULTS(projectId)}${q}`
  const { data } = await apiClient.get<ApiResponse<SupervisionReportFormDefaults>>(url)
  return data.data
}

export async function getSupervisionReportPccesWorkItems(
  projectId: string,
  params: { reportDate: string; excludeReportId?: string }
): Promise<SupervisionReportPccesPickerResponse> {
  const search = new URLSearchParams()
  search.set('reportDate', params.reportDate)
  if (params.excludeReportId) search.set('excludeReportId', params.excludeReportId)
  const url = `${API_PATH.PROJECT_SUPERVISION_REPORT_PCCES_WORK_ITEMS(projectId)}?${search}`
  const { data } = await apiClient.get<ApiResponse<SupervisionReportPccesPickerResponse>>(url)
  return data.data
}

export async function getSupervisionReport(
  projectId: string,
  reportId: string
): Promise<SupervisionReportDto> {
  const { data } = await apiClient.get<ApiResponse<SupervisionReportDto>>(
    API_PATH.PROJECT_SUPERVISION_REPORT(projectId, reportId)
  )
  return data.data
}

export async function createSupervisionReport(
  projectId: string,
  payload: SupervisionReportUpsertPayload
): Promise<SupervisionReportDto> {
  const { data } = await apiClient.post<ApiResponse<SupervisionReportDto>>(
    API_PATH.PROJECT_SUPERVISION_REPORTS(projectId),
    payload
  )
  return data.data
}

export async function updateSupervisionReport(
  projectId: string,
  reportId: string,
  payload: SupervisionReportUpsertPayload
): Promise<SupervisionReportDto> {
  const { data } = await apiClient.patch<ApiResponse<SupervisionReportDto>>(
    API_PATH.PROJECT_SUPERVISION_REPORT(projectId, reportId),
    payload
  )
  return data.data
}

export async function deleteSupervisionReport(
  projectId: string,
  reportId: string
): Promise<void> {
  await apiClient.delete<ApiResponse<{ ok: boolean }>>(
    API_PATH.PROJECT_SUPERVISION_REPORT(projectId, reportId)
  )
}

export function getSupervisionReportExcelUrl(projectId: string, reportId: string): string {
  return API_PATH.PROJECT_SUPERVISION_REPORT_EXPORT_EXCEL(projectId, reportId)
}
