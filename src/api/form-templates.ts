import { apiClient } from './client'
import { API_PATH } from '@/constants/api'
import type { ApiResponse } from '@/types/api'

export interface FormTemplateItem {
  id: string
  name: string
  description: string | null
  fileName: string
  fileSize: number
  mimeType?: string
  projectId?: string | null
  isDefault?: boolean
  uploaderName?: string | null
  createdAt: string
  updatedAt: string
}

/** 後台預設樣板列表 */
export async function listDefaultFormTemplates(tenantId?: string): Promise<FormTemplateItem[]> {
  const { data } = await apiClient.get<ApiResponse<FormTemplateItem[]>>(API_PATH.ADMIN_FORM_TEMPLATES, {
    params: tenantId ? { tenantId } : undefined,
  })
  return data.data ?? []
}

/** 後台新增預設樣板（multipart: file, name, description） */
export async function createDefaultFormTemplate(params: {
  file: File
  name: string
  description?: string
  tenantId?: string
}): Promise<FormTemplateItem> {
  const form = new FormData()
  form.append('file', params.file)
  form.append('name', params.name.trim() || params.file.name)
  if (params.description != null) form.append('description', params.description)
  if (params.tenantId) form.append('tenantId', params.tenantId)
  const { data } = await apiClient.post<ApiResponse<FormTemplateItem>>(API_PATH.ADMIN_FORM_TEMPLATES, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.data
}

/** 專案可見樣板列表（預設+專案） */
export async function listProjectFormTemplates(projectId: string): Promise<FormTemplateItem[]> {
  const { data } = await apiClient.get<ApiResponse<FormTemplateItem[]>>(
    API_PATH.PROJECT_FORM_TEMPLATES(projectId)
  )
  return data.data ?? []
}

/** 專案新增樣板（multipart: file, name, description） */
export async function createProjectFormTemplate(
  projectId: string,
  params: { file: File; name: string; description?: string }
): Promise<FormTemplateItem> {
  const form = new FormData()
  form.append('file', params.file)
  form.append('name', params.name.trim() || params.file.name)
  if (params.description != null) form.append('description', params.description)
  const { data } = await apiClient.post<ApiResponse<FormTemplateItem>>(
    API_PATH.PROJECT_FORM_TEMPLATES(projectId),
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return data.data
}

/** 下載樣板檔案 */
export async function getFormTemplateBlob(
  id: string,
  options?: { fileName?: string }
): Promise<{ blob: Blob; fileName: string }> {
  const res = await apiClient.get(API_PATH.FORM_TEMPLATE(id), {
    responseType: 'blob',
    params: { download: 'true' },
  })
  const blob = res.data as Blob
  const disposition = res.headers['content-disposition'] as string | undefined
  let fileName = options?.fileName ?? 'download'
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;\s]+)/i)
    if (utf8Match) {
      try {
        fileName = decodeURIComponent(utf8Match[1].trim())
      } catch {
        // keep default
      }
    }
  }
  return { blob, fileName }
}

/** 更新樣板名稱、描述 */
export async function updateFormTemplate(
  id: string,
  data: { name?: string; description?: string | null }
): Promise<{ id: string; name: string; description: string | null; updatedAt: string }> {
  const res = await apiClient.patch(API_PATH.FORM_TEMPLATE(id), data)
  return (res.data as ApiResponse<{ id: string; name: string; description: string | null; updatedAt: string }>).data
}

/** 刪除樣板 */
export async function deleteFormTemplate(id: string): Promise<void> {
  await apiClient.delete(API_PATH.FORM_TEMPLATE(id))
}
