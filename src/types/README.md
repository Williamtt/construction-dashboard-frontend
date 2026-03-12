# 型別管理規範（Types）

前端型別集中放在 `src/types/`，依**領域／模組**分檔，與後端 API 或前端功能對齊，方便維護與重用。

## 檔案分類方式

| 檔案 | 用途 | 範例型別 |
|------|------|----------|
| **api.ts** | 通用 API 回應、錯誤、分頁 | `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError` |
| **auth.ts** | 登入、JWT、當前使用者 | `User`, `SystemRole`, `LoginPayload`, `LoginResponse` |
| **project.ts** | 專案（列表、建立/編輯、平台總覽） | `ProjectItem`, `PlatformProjectItem` |
| **tenant.ts** | 租戶（列表、建立/更新） | `TenantItem`, `CreateTenantPayload`, `UpdateTenantPayload` |
| **user.ts** | 使用者（平台/租戶後台列表、成員） | `PlatformUserItem`, `AdminUserItem` |
| **contract.ts** | 契約（檔案、工期調整） | `ContractFileRow`, `ScheduleAdjustmentRow`, `ScheduleRowItem` |
| **monitoring.ts** | 監測（設備、每日數據、圖表用） | `MonitoringDeviceItem`, `MonitoringDailyRow` |
| **dashboard.ts** | 儀表板 KPI、警報、圖表 | `ProjectInfoKpi`, `AlertItem`, `MonitoringChartData` |
| **navigation.ts** | 側欄導航結構 | `NavItem`, `NavItemProject`, `NavGroup`, `NavGroupProject`, `SidebarEntry` |
| **common.ts** | 跨模組共用（麵包屑、分頁選項等） | `BreadcrumbItem`, `UsePaginationOptions` |

## 命名與放置原則

1. **與 API 對齊**：後端回傳的列表項、payload 型別放在對應領域檔（如 `GET /admin/projects` 回傳項 → `project.ts` 的 `ProjectItem`）。
2. **一領域一檔**：同一業務的型別放同一檔，避免單檔過大時再拆成 `project-list.ts`、`project-form.ts` 等子檔。
3. **可選欄位**：與後端一致用 `?` 或 `| null`；列表額外欄位（如 `tenantName`）可標為 optional。
4. **不放入 types 的**：僅單一元件使用的 `interface Props`、CVA 的 `Variants` 型別保留在該元件或 `index.ts`。

## 使用方式

- 元件／API／store 需要型別時：`import type { ProjectItem } from '@/types'` 或 `from '@/types/project'`。
- `types/index.ts` 會 re-export 各檔，可統一從 `@/types` 匯入。

## 新增型別時

1. 判斷所屬領域（專案／租戶／使用者／契約／監測／儀表板／導航／通用）。
2. 在對應 `types/xxx.ts` 新增並 export。
3. 若為新領域，可新增 `types/xxx.ts` 並在 `types/index.ts` 補上 `export * from './xxx'`。
