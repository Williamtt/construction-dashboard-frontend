# Sidebar 架構與使用說明

本文件說明 **Sidebar 元件結構**（參考 shadcn-vue）、**本專案實作方式**與**相關檔案**。

---

## 一、Sidebar 元件結構（參考 shadcn-vue）

Sidebar 由以下部分組成，實作或重構時可對齊此結構。

| 元件 | 說明 |
|------|------|
| **SidebarProvider** | 管理收合狀態（collapsible state），包住整個 Sidebar 區塊。 |
| **Sidebar** | 側欄容器本體。 |
| **SidebarHeader** | 側欄頂部區塊，sticky 貼頂。 |
| **SidebarFooter** | 側欄底部區塊，sticky 貼底。 |
| **SidebarContent** | 可捲動的主要內容區。 |
| **SidebarGroup** | 在 SidebarContent 內的分區（例如「導航」「設定」）。 |
| **SidebarTrigger** | 觸發收合／展開的按鈕（常放在 Header 內或主內容區頂部）。 |

### 結構示意

```
SidebarProvider
└── Sidebar
    ├── SidebarHeader    （頂部固定）
    ├── SidebarContent   （可捲動）
    │   └── SidebarGroup（可多個）
    └── SidebarFooter    （底部固定）
```

---

## 二、本專案目前的實作

目前**未**使用 shadcn-vue 的 Sidebar 元件，而是以自訂元件 + Pinia 實作，行為與上述結構對應關係如下。

| 概念 | 本專案對應 |
|------|------------|
| 收合狀態 | Pinia `useSidebarStore`（`collapsed`、`mobileOpen`） |
| 側欄容器 | Layout 內 `<aside>`（桌面）與 Sheet（手機） |
| 可捲動內容 | `AppSidebar.vue` 內用 `ScrollArea` 包導航 |
| 觸發按鈕 | `AppHeader.vue` 左側選單按鈕（`SidebarTrigger` 概念） |

- **桌面**：Sidebar 為左側固定 `<aside>`，可收合（只顯示 icon）；收合狀態由 `sidebarStore.collapsed` 控制。
- **手機**：Sidebar 內容改放在從左滑出的 **Sheet** 內，開關由 `sidebarStore.mobileOpen` 控制；Header 左側按鈕在手機上改為打開 Sheet。

若日後改用 shadcn-vue 的 Sidebar 元件，可依上表對應到 `SidebarProvider`、`Sidebar`、`SidebarContent`、`SidebarTrigger` 等。

---

## 三、檔案結構

| 檔案 | 職責 |
|------|------|
| `src/components/common/AppSidebar.vue` | 側欄 UI：導航項目、收合時 icon + Tooltip、展開時 icon + 文字。 |
| `src/components/common/AppHeader.vue` | 內含觸發按鈕：桌面切換收合、手機打開 Sheet。 |
| `src/stores/sidebar.ts` | `collapsed`、`mobileOpen`、`toggleCollapsed`、`toggleMobileOpen`、`setMobileOpen`。 |
| `src/constants/navigation.ts` | 導航項目：`SIDEBAR_NAV_ITEMS`（id、label、path、icon）。 |
| `src/layouts/DefaultLayout.vue` | 桌面渲染 `<aside>` + `AppSidebar`；手機渲染 `Sheet` 包 `AppSidebar`；主內容區放 Header + 麵包屑 + main。 |

---

## 四、導航項目與樣式

- 導航資料來自 **`src/constants/navigation.ts`**：**`LAYER1_ENTRIES`**（未進專案）、**`LAYER2_ITEMS`**（專案內第一層，含 drill 進 Layer 3）、**`LAYER3_PROJECT_MGMT` / `LAYER3_CONSTRUCTION` / `LAYER3_REPAIR`**，以及後台用的 **`GLOBAL_SIDEBAR_ENTRIES`**、**`ADMIN_SIDEBAR_ENTRIES`**、**`PLATFORM_ADMIN_*`** 等。
- 專案內實際 path 一律用 **`buildProjectPath(projectId, pathSuffix)`**（見 `project-routes` 規則）。
- `AppSidebar` 內用 `ICON_MAP` 將 icon 字串對應到 lucide 元件；新增項目時需在 `ICON_MAP` 補上對應元件。
- 項目間距為 `gap-2`，每個項目有固定 `min-h-9`，收合時按鈕為固定 `h-9 w-9`，避免跑版。

---

## 五、響應式行為

- **斷點**：以 `md`（768px）為界，透過 `useIsMobile()` 判斷。
- **桌面（≥ md）**：左側固定 Sidebar，Header 左側按鈕切換 `collapsed`；路由變更不影響 Sidebar 顯示。
- **手機（< md）**：不顯示固定 Sidebar；Header 左側按鈕改為打開 Sheet，Sheet 內為同一份 `AppSidebar`；路由變更時在 Layout 內 `watch(route.path)` 會呼叫 `setMobileOpen(false)` 關閉 Sheet。

---

## 六、相關文件

- **路由與側欄約定**：`.cursor/rules/project-routes.mdc`
- **麵包屑**：位於 Header 下方，見 [breadcrumb.md](./breadcrumb.md)。
- **文件總索引**：[docs/README.md](./README.md)
