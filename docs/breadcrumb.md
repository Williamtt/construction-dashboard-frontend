# 麵包屑（Breadcrumb）架構與使用說明

本文件說明麵包屑的**架構**、**資料流**與**擴充方式**。

---

## 一、架構概覽

麵包屑由三層組成：**常數（標籤對應）→ Composables（依路由算出項目）→ 元件（渲染）**。Layout 只負責放置元件，不處理路徑邏輯。

```
┌─────────────────────────────────────────────────────────────────┐
│  Layout（DefaultLayout.vue）                                      │
│  └─ 在 Header 下方、main 上方放 <AppBreadcrumb />                 │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  AppBreadcrumb.vue                                                │
│  └─ 使用 useBreadcrumb() 取得 items，用 shadcn Breadcrumb 渲染     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  useBreadcrumb()（composables/useBreadcrumb.ts）                   │
│  └─ 讀取當前 route.path，對照 BREADCRUMB_LABELS 組出麵包屑項目     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  BREADCRUMB_LABELS（constants/breadcrumb.ts）                     │
│  └─ path → 顯示名稱的對照表                                       │
└─────────────────────────────────────────────────────────────────┘
```

- **常數**：決定「某個 path 要顯示什麼文字」。
- **Composable**：根據當前路由 path 拆成層級，組出 `{ label, to? }[]`。
- **元件**：只負責顯示與連結（RouterLink / 當前頁純文字）。

---

## 二、檔案結構

| 檔案 | 職責 |
|------|------|
| `src/constants/breadcrumb.ts` | 定義 `BREADCRUMB_LABELS`：`path → label` 對照，供 composable 查表。 |
| `src/composables/useBreadcrumb.ts` | 依 `route.path` 與 `BREADCRUMB_LABELS` 算出 `items`（`BreadcrumbItem[]`）。 |
| `src/components/common/AppBreadcrumb.vue` | 使用 `useBreadcrumb()`，以 shadcn-vue 的 Breadcrumb 元件渲染。 |
| `src/layouts/DefaultLayout.vue` | 在 Header 下方、main 上方插入 `<AppBreadcrumb />`。 |
| `src/components/ui/breadcrumb/*` | shadcn-vue 的 Breadcrumb 底層元件（BreadcrumbList、BreadcrumbItem、BreadcrumbLink、BreadcrumbPage、BreadcrumbSeparator）。 |

---

## 三、資料流

1. 使用者切換路由 → `route.path` 改變（例如 `/dashboard`、`/projects`）。
2. `useBreadcrumb()` 內用 `computed` 依 `route.path` 計算：
   - 首項固定為「首頁」，`to: '/'`。
   - 其餘依 path 拆成段落（如 `/dashboard` → `['dashboard']`），每段對應一個 `BREADCRUMB_LABELS` 的 key，產出 `{ label, to? }`。
   - 最後一項為當前頁，不帶 `to`（不渲染成連結）。
3. `AppBreadcrumb` 依 `items` 渲染：有 `to` 的用 `BreadcrumbLink` + `RouterLink`，最後一項用 `BreadcrumbPage`，中間用 `BreadcrumbSeparator` 分隔。

範例：

- `path = '/'` → `[{ label: '首頁' }]`
- `path = '/dashboard'` → `[{ label: '首頁', to: '/' }, { label: '儀表板' }]`
- `path = '/projects'` → `[{ label: '首頁', to: '/' }, { label: '專案列表' }]`

---

## 四、新增路由時如何補上麵包屑

1. 在 **`src/constants/breadcrumb.ts`** 的 `BREADCRUMB_LABELS` 裡加上對應的 path 與顯示名稱：

```ts
export const BREADCRUMB_LABELS: Record<string, string> = {
  // ... 既有
  '/your-new-path': '新頁面名稱',
  '/dashboard/your-sub': '子頁面名稱',
}
```

2. path 須與 `route.path` 一致（含開頭 `/`、層級）。  
3. 不需改 `useBreadcrumb` 或 `AppBreadcrumb`，composable 會依 path 層級自動拆段並查表；若某段 path 在 `BREADCRUMB_LABELS` 沒有對應，會用 path 最後一段當 fallback 顯示。

---

## 五、自訂與擴充

- **改顯示文字**：只改 `constants/breadcrumb.ts` 的 `BREADCRUMB_LABELS`。
- **改樣式**：在 `AppBreadcrumb.vue` 或 Layout 的麵包屑外層加 class；或改 `src/components/ui/breadcrumb/*`（需注意 shadcn 規範）。
- **動態 label（例如依專案名稱）**：可在 `useBreadcrumb` 裡讀 route params / query 或 store，在組 `items` 時改對應的 `label`；常數表仍保留預設 label，動態只覆寫特定項。
- **麵包屑不顯示在部分頁面**：在 Layout 用 `v-if` 依 `route.path` 或 `route.meta` 決定是否渲染 `<AppBreadcrumb />`。

---

## 六、型別

- **`BreadcrumbItem`**（由 `@/composables` 匯出）：
  - `label: string`：顯示文字。
  - `to?: string`：有值時為可點連結（RouterLink）；無則為當前頁，僅顯示文字。

---

## 七、與實作指南的關係

麵包屑屬於「Layout / 導航」一環，與 `DefaultLayout`、`AppHeader` 並列。請確認 `AppBreadcrumb.vue`、`constants/breadcrumb.ts` 存在，且 `DefaultLayout` 已在主內容區上方插入 `<AppBreadcrumb />`（見本文件前述檔案索引）。
