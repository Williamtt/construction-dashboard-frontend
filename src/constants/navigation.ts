/**
 * 側欄導航項目，供 AppSidebar 使用
 */
export interface NavItem {
  id: string
  label: string
  path: string
  /** lucide 圖示名稱，與元件對應 */
  icon: string
}

export const SIDEBAR_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '首頁', path: '/', icon: 'LayoutDashboard' },
  { id: 'dashboard', label: '儀表板', path: '/dashboard', icon: 'LayoutGrid' },
  { id: 'projects', label: '專案列表', path: '/projects', icon: 'FolderKanban' },
  { id: 'layout-verify', label: 'Layout 驗證', path: '/layout-verify', icon: 'ClipboardCheck' },
  { id: 'data-table-demo', label: 'DataTable 展示', path: '/data-table-demo', icon: 'Table2' },
]
