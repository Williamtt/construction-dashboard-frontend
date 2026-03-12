/**
 * 跨模組共用型別（麵包屑、分頁選項等）
 */

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface UsePaginationOptions {
  initialPage?: number
  initialLimit?: number
  total?: number
}
