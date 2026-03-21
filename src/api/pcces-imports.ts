import { apiClient } from './client'
import { API_PATH } from '@/constants/api'
import type { ApiResponse } from '@/types/api'

export interface PccesImportSummary {
  id: string
  projectId: string
  version: number
  documentType: string | null
  fileName: string
  attachmentId: string | null
  itemCount: number
  generalCount: number
  /** ISO；null 表示尚未核定（施工日誌僅能引用已核定版之工項） */
  approvedAt: string | null
  approvedById: string | null
  createdAt: string
  createdById: string
}

export interface PccesItemDto {
  id: string
  itemKey: number
  parentItemKey: number | null
  itemNo: string
  itemKind: string
  refCode: string
  description: string
  unit: string
  quantity: string
  unitPrice: string
  amountImported: string | null
  remark: string
  percent: string | null
  path: string
  depth: number
}

export async function listPccesImports(projectId: string): Promise<PccesImportSummary[]> {
  const { data } = await apiClient.get<ApiResponse<PccesImportSummary[]>>(
    API_PATH.PROJECT_PCCES_IMPORTS(projectId)
  )
  return data.data
}

export async function uploadPccesImport(projectId: string, file: File): Promise<PccesImportSummary> {
  const form = new FormData()
  form.append('file', file, file.name)
  const { data } = await apiClient.post<ApiResponse<PccesImportSummary>>(
    API_PATH.PROJECT_PCCES_IMPORTS(projectId),
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data.data
}

export async function getPccesImport(
  projectId: string,
  importId: string
): Promise<PccesImportSummary> {
  const { data } = await apiClient.get<ApiResponse<PccesImportSummary>>(
    API_PATH.PROJECT_PCCES_IMPORT(projectId, importId)
  )
  return data.data
}

export interface PccesImportItemsResult {
  import: PccesImportSummary
  items: PccesItemDto[]
  meta: { page: number; limit: number; total: number }
}

export async function deletePccesImport(projectId: string, importId: string): Promise<void> {
  await apiClient.delete<ApiResponse<{ ok: boolean }>>(
    API_PATH.PROJECT_PCCES_IMPORT(projectId, importId)
  )
}

export async function approvePccesImport(
  projectId: string,
  importId: string
): Promise<PccesImportSummary> {
  const { data } = await apiClient.post<ApiResponse<PccesImportSummary>>(
    API_PATH.PROJECT_PCCES_IMPORT_APPROVE(projectId, importId)
  )
  return data.data
}

export async function getPccesImportItems(
  projectId: string,
  importId: string,
  params: {
    page?: number
    limit?: number
    itemKind?: 'general' | 'mainItem' | ''
    /** 一次載入該匯入之全部工項（後端有筆數上限） */
    all?: boolean
  }
): Promise<PccesImportItemsResult> {
  const search = new URLSearchParams()
  if (params.all) {
    search.set('all', '1')
  } else {
    if (params.page != null) search.set('page', String(params.page))
    if (params.limit != null) search.set('limit', String(params.limit))
  }
  if (params.itemKind === 'general' || params.itemKind === 'mainItem') {
    search.set('itemKind', params.itemKind)
  }
  const q = search.toString()
  const url = `${API_PATH.PROJECT_PCCES_IMPORT_ITEMS(projectId, importId)}${q ? `?${q}` : ''}`
  const { data: body } = await apiClient.get<
    ApiResponse<{ import: PccesImportSummary; items: PccesItemDto[] }>
  >(url)
  const meta = body.meta
  if (meta?.page == null || meta?.limit == null || meta?.total == null) {
    throw new Error('Invalid paginated response')
  }
  return {
    import: body.data.import,
    items: body.data.items,
    meta: { page: meta.page, limit: meta.limit, total: meta.total },
  }
}
