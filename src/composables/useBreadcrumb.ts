import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { BREADCRUMB_LABELS } from '@/constants/breadcrumb'

export interface BreadcrumbItem {
  label: string
  to?: string
}

/**
 * 依當前路由 path 組出麵包屑項目（首項為首頁，最後一項為當前頁、不帶連結）
 */
export function useBreadcrumb() {
  const route = useRoute()

  const items = computed<BreadcrumbItem[]>(() => {
    const path = route.path
    if (!path || path === '/') {
      return [{ label: BREADCRUMB_LABELS['/'] ?? '首頁' }]
    }

    const segments = path.split('/').filter(Boolean)
    const result: BreadcrumbItem[] = []

    let acc = ''
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`
      const label = BREADCRUMB_LABELS[acc] ?? segments[i]
      result.push(
        i === segments.length - 1
          ? { label }
          : { label, to: acc },
      )
    }

    if (result.length === 0) {
      return [{ label: BREADCRUMB_LABELS['/'] ?? '首頁' }]
    }

    const homeLabel = BREADCRUMB_LABELS['/'] ?? '首頁'
    return [{ label: homeLabel, to: '/' }, ...result]
  })

  return { items }
}
