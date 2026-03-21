import { apiClient } from './client'
import { API_PATH } from '@/constants/api'
import type { ApiResponse } from '@/types/api'

export interface ConstructionValuationListItemDto {
  id: string
  title: string | null
  valuationDate: string | null
  headerRemark: string
  currentPeriodTotalAmount: string
  createdAt: string
  updatedAt: string
}

export interface ConstructionValuationLineDto {
  id: string
  pccesItemId: string | null
  /** PCCES 父階 itemKey；手填列通常為 null */
  pccesParentItemKey?: number | null
  itemNo: string
  description: string
  unit: string
  contractQty: string
  approvedQtyAfterChange: string | null
  unitPrice: string
  currentPeriodQty: string
  remark: string
  priorBilledQty: string
  maxQty: string
  availableValuationQty: string
  cumulativeValuationQtyToDate: string
  currentPeriodAmount: string
  cumulativeAmountToDate: string
}

/** 與 `lines` 同序之重排區段；父列僅供 UI，金額為子列 (六)(七) 加總 */
export interface ConstructionValuationLineGroupDto {
  parent: {
    itemNo: string
    description: string
    unit: string
    currentPeriodAmountSum: string
    cumulativeAmountToDateSum: string
  } | null
  lineStartIndex: number
  lineCount: number
}

export interface ConstructionValuationDto {
  id: string
  projectId: string
  title: string | null
  valuationDate: string | null
  headerRemark: string
  createdById: string
  createdAt: string
  updatedAt: string
  lines: ConstructionValuationLineDto[]
  lineGroups?: ConstructionValuationLineGroupDto[]
}

export interface ConstructionValuationPccesPickerImport {
  id: string
  version: number
  approvedAt: string | null
  approvedById: string | null
}

export interface ConstructionValuationPccesPickerItem {
  pccesItemId: string
  itemNo: string
  description: string
  unit: string
  contractQty: string
  approvedQtyAfterChange: string | null
  unitPrice: string
  priorBilledQty: string
  maxQty: string
  suggestedAvailableQty: string
}

export interface ConstructionValuationPccesPickerGroup {
  parent: { itemNo: string; description: string; unit: string; itemKey: number } | null
  children: ConstructionValuationPccesPickerItem[]
}

export interface ConstructionValuationPccesPickerResponse {
  pccesImport: ConstructionValuationPccesPickerImport | null
  groups: ConstructionValuationPccesPickerGroup[]
  items: ConstructionValuationPccesPickerItem[]
}

export type ConstructionValuationUpsertPayload = {
  title?: string | null
  valuationDate?: string | null
  headerRemark: string
  lines: {
    pccesItemId?: string
    itemNo: string
    description: string
    unit: string
    contractQty: string
    approvedQtyAfterChange?: string | null
    unitPrice: string
    currentPeriodQty: string
    remark: string
  }[]
}

export async function listConstructionValuations(
  projectId: string,
  params: { page?: number; limit?: number }
): Promise<{
  list: ConstructionValuationListItemDto[]
  meta: { page: number; limit: number; total: number }
}> {
  const search = new URLSearchParams()
  if (params.page != null) search.set('page', String(params.page))
  if (params.limit != null) search.set('limit', String(params.limit))
  const q = search.toString()
  const url = `${API_PATH.PROJECT_CONSTRUCTION_VALUATIONS(projectId)}${q ? `?${q}` : ''}`
  const { data: body } = await apiClient.get<ApiResponse<ConstructionValuationListItemDto[]>>(url)
  const meta = body.meta
  if (!meta?.page || !meta.limit || meta.total === undefined) {
    throw new Error('Invalid list response')
  }
  return { list: body.data, meta: { page: meta.page, limit: meta.limit, total: meta.total } }
}

export async function getConstructionValuationPccesLines(
  projectId: string,
  params?: { excludeValuationId?: string }
): Promise<ConstructionValuationPccesPickerResponse> {
  const search = new URLSearchParams()
  if (params?.excludeValuationId) search.set('excludeValuationId', params.excludeValuationId)
  const q = search.toString()
  const url = `${API_PATH.PROJECT_CONSTRUCTION_VALUATION_PCCES_LINES(projectId)}${q ? `?${q}` : ''}`
  const { data: body } = await apiClient.get<ApiResponse<ConstructionValuationPccesPickerResponse>>(url)
  const payload = body?.data
  if (payload == null || typeof payload !== 'object') {
    throw new Error('回應缺少 data：請確認 API 契約是否為 { data: { groups, items, ... } }')
  }
  if (!Array.isArray(payload.groups)) {
    throw new Error(`回應格式異常：groups 必須為陣列（目前為 ${typeof payload.groups}）`)
  }
  if (!Array.isArray(payload.items)) {
    throw new Error(`回應格式異常：items 必須為陣列（目前為 ${typeof payload.items}）`)
  }
  return payload
}

export async function getConstructionValuation(
  projectId: string,
  valuationId: string
): Promise<ConstructionValuationDto> {
  const { data } = await apiClient.get<ApiResponse<ConstructionValuationDto>>(
    API_PATH.PROJECT_CONSTRUCTION_VALUATION(projectId, valuationId)
  )
  return data.data
}

export async function createConstructionValuation(
  projectId: string,
  payload: ConstructionValuationUpsertPayload
): Promise<ConstructionValuationDto> {
  const { data } = await apiClient.post<ApiResponse<ConstructionValuationDto>>(
    API_PATH.PROJECT_CONSTRUCTION_VALUATIONS(projectId),
    payload
  )
  return data.data
}

export async function updateConstructionValuation(
  projectId: string,
  valuationId: string,
  payload: ConstructionValuationUpsertPayload
): Promise<ConstructionValuationDto> {
  const { data } = await apiClient.patch<ApiResponse<ConstructionValuationDto>>(
    API_PATH.PROJECT_CONSTRUCTION_VALUATION(projectId, valuationId),
    payload
  )
  return data.data
}

export async function deleteConstructionValuation(projectId: string, valuationId: string): Promise<void> {
  await apiClient.delete<ApiResponse<{ ok: boolean }>>(
    API_PATH.PROJECT_CONSTRUCTION_VALUATION(projectId, valuationId)
  )
}
