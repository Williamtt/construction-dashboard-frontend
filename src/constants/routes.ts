/**
 * 路由 path / name 常數，避免 magic string
 */
export const ROUTE_PATH = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  DASHBOARD_MONITORING: '/dashboard/monitoring',
  DASHBOARD_EXECUTION: '/dashboard/execution',
  PROJECTS: '/projects',
  /** 驗證用測試頁（Layout / 導航 / 區塊） */
  LAYOUT_VERIFY: '/layout-verify',
} as const

export const ROUTE_NAME = {
  HOME: 'home',
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  DASHBOARD_MONITORING: 'dashboard-monitoring',
  DASHBOARD_EXECUTION: 'dashboard-execution',
  PROJECTS: 'projects',
  LAYOUT_VERIFY: 'layout-verify',
} as const
