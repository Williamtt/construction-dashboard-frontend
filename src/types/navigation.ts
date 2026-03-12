/**
 * 側欄導航結構（供 AppSidebar、constants/navigation 使用）
 * 專案內路徑為 /p/:projectId/...，需用 buildProjectPath(projectId, pathSuffix) 組出實際 path
 */

export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
}

/** 專案內導航子項（path 為 pathSuffix，實際 path = /p/:projectId + pathSuffix） */
export interface NavItemProject {
  id: string
  label: string
  pathSuffix: string
  icon: string
}

export interface NavGroup {
  id: string
  label: string
  children: NavItem[]
}

export interface NavGroupProject {
  id: string
  label: string
  children: NavItemProject[]
}

export type SidebarEntry =
  | { type: 'item'; item: NavItem }
  | { type: 'group'; group: NavGroup }
