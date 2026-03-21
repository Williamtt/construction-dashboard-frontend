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
  /** 綁定 PCCES 時之 XML itemKind；手填列為 null */
  pccesItemKind?: string | null
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
  /** PCCES 列：施工日誌截至估驗日之累計完成；手填列為 null */
  logAccumulatedQtyToDate: string | null
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

/** 與「PCCES 明細／全部類型」同序（itemKey 升序）；非末層之估驗聚合欄位為 null */
export interface ConstructionValuationPccesPickerRow {
  pccesItemId: string
  itemKey: number
  parentItemKey: number | null
  itemNo: string
  description: string
  unit: string
  itemKind: string
  contractQty: string
  approvedQtyAfterChange: string | null
  unitPrice: string
  isStructuralLeaf: boolean
  priorBilledQty: string | null
  maxQty: string | null
  logAccumulatedQtyToDate: string | null
  suggestedAvailableQty: string | null
}

/** @deprecated 後端回傳空陣列；請改用 `rows` */
export interface ConstructionValuationPccesPickerGroup {
  parent: { itemNo: string; description: string; unit: string; itemKey: number } | null
  children: ConstructionValuationPccesPickerRow[]
}

export interface ConstructionValuationPccesPickerResponse {
  pccesImport: ConstructionValuationPccesPickerImport | null
  rows: ConstructionValuationPccesPickerRow[]
  /** @deprecated 請改用 `rows` */
  groups: ConstructionValuationPccesPickerGroup[]
  items: ConstructionValuationPccesPickerRow[]
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
  params?: { excludeValuationId?: string; /** YYYY-MM-DD；施工日誌累計算至該日（含），省略則截至今日 UTC */ asOfDate?: string }
): Promise<ConstructionValuationPccesPickerResponse> {
  const search = new URLSearchParams()
  if (params?.excludeValuationId) search.set('excludeValuationId', params.excludeValuationId)
  if (params?.asOfDate?.trim()) search.set('asOfDate', params.asOfDate.trim())
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
