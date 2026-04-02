<script setup lang="ts">
import type { ColumnDef, FilterFn } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useRoute, RouterLink, type RouteLocationRaw } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DataTableColumnHeader from '@/components/common/data-table/DataTableColumnHeader.vue'
import DataTableFeatureSection from '@/components/common/data-table/DataTableFeatureSection.vue'
import DataTableFeatureToolbar from '@/components/common/data-table/DataTableFeatureToolbar.vue'
import DataTablePagination from '@/components/common/data-table/DataTablePagination.vue'
import { useClientDataTable } from '@/composables/useClientDataTable'
import { buildProjectPath, ROUTE_PATH, ROUTE_NAME } from '@/constants/routes'
import { formatThousands } from '@/lib/format-number'
import {
  listSupervisionReports,
  deleteSupervisionReport,
  type SupervisionReportListItemDto,
} from '@/api/supervision-reports'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { Loader2, Plus, ShieldCheck } from 'lucide-vue-next'
import type { TableListFeatures } from '@/types/data-table'

const route = useRoute()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const perm = useProjectModuleActions(projectId, 'construction.supervision')

const list = ref<SupervisionReportListItemDto[]>([])
const loading = ref(true)
const errorMessage = ref('')
const batchDeleteOpen = ref(false)
const batchDeleteLoading = ref(false)

const TABLE_FEATURES: TableListFeatures = {
  search: true,
  filtersAndSort: true,
  columnVisibility: false,
}

const COLUMN_LABELS: Record<string, string> = {
  reportDate: '填報日期',
  reportNo: '系統編號',
  constructionActualProgress: '施工實際進度（%）',
  overallActualProgress: '全案實際進度（%）',
}

const globalFilterFn: FilterFn<SupervisionReportListItemDto> = (row, _columnId, filterValue) => {
  const q = String(filterValue ?? '').trim().toLowerCase()
  if (!q) return true
  const r = row.original
  const parts = [
    r.reportDate,
    r.reportNo ?? '',
    r.weatherAm ?? '',
    r.weatherPm ?? '',
    r.projectName ?? '',
    r.constructionActualProgress ?? '',
    r.overallActualProgress ?? '',
  ].map((s) => String(s).toLowerCase())
  return parts.some((p) => p.includes(q))
}

async function load() {
  if (!projectId.value) return
  loading.value = true
  try {
    const all: SupervisionReportListItemDto[] = []
    let page = 1
    const limit = 100
    for (let i = 0; i < 200; i++) {
      const res = await listSupervisionReports(projectId.value, { page, limit })
      all.push(...res.list)
      if (res.list.length === 0 || res.list.length < limit || all.length >= res.meta.total) break
      page++
    }
    list.value = all
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function weatherBrief(row: SupervisionReportListItemDto) {
  const a = row.weatherAm?.trim()
  const p = row.weatherPm?.trim()
  if (a && p) return `${a}／${p}`
  return a || p || '—'
}

const newReportPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_SUPERVISION_NEW)
)

const selectColumn: ColumnDef<SupervisionReportListItemDto, unknown> = {
  id: 'select',
  header: ({ table }) =>
    h(Checkbox, {
      checked: table.getIsAllPageRowsSelected()
        ? true
        : table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : false,
      'onUpdate:checked': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v),
      'aria-label': '全選此頁',
    }),
  cell: ({ row }) =>
    h(Checkbox, {
      checked: row.getIsSelected(),
      'onUpdate:checked': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
      'aria-label': '選取此列',
    }),
  enableSorting: false,
  enableHiding: false,
}

const columns = computed<ColumnDef<SupervisionReportListItemDto, unknown>[]>(() => [
  selectColumn,
  {
    accessorKey: 'reportDate',
    id: 'reportDate',
    header: ({ column }) =>
      h(DataTableColumnHeader, { column, title: '填報日期', class: 'text-foreground' }),
    meta: {
      label: '填報日期',
      searchable: true,
      filter: { type: 'dateRange', title: '填報日期' },
    },
    filterFn: (row, _columnId, raw) => {
      const v = raw as { from?: string; to?: string } | undefined
      if (!v?.from && !v?.to) return true
      const d = row.original.reportDate
      if (v.from && d < v.from) return false
      if (v.to && d > v.to) return false
      return true
    },
    sortingFn: 'alphanumeric',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-foreground' }, row.original.reportDate),
    enableHiding: false,
  },
  {
    accessorKey: 'reportNo',
    id: 'reportNo',
    header: () => '系統編號',
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, row.original.reportNo?.trim() || '—'),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'weather',
    header: () => '天氣（上／下）',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted-foreground' }, weatherBrief(row.original)),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'constructionActualProgress',
    id: 'constructionActualProgress',
    header: () => '施工實際進度（%）',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-foreground' },
        row.original.constructionActualProgress == null
          ? '—'
          : formatThousands(row.original.constructionActualProgress, { maximumFractionDigits: 2 })
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'overallActualProgress',
    id: 'overallActualProgress',
    header: () => '全案實際進度（%）',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-foreground' },
        row.original.overallActualProgress == null
          ? '—'
          : formatThousands(row.original.overallActualProgress, { maximumFractionDigits: 2 })
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: () => '',
    cell: ({ row }) => {
      const to: RouteLocationRaw = {
        name: ROUTE_NAME.PROJECT_CONSTRUCTION_SUPERVISION_DETAIL,
        params: { projectId: projectId.value, reportId: row.original.id },
      }
      return h(
        RouterLink,
        {
          to,
          class: 'inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline',
        },
        () => '編輯'
      )
    },
    enableSorting: false,
    enableHiding: false,
  },
])

const { table, globalFilter, hasActiveFilters, resetTableState } = useClientDataTable({
  data: list,
  columns,
  features: TABLE_FEATURES,
  getRowId: (row) => row.id,
  globalFilterFn,
  initialPageSize: 20,
})

const selectedRows = computed(() => table.getSelectedRowModel().rows)
const hasSelection = computed(() => selectedRows.value.length > 0)
const selectedCount = computed(() => selectedRows.value.length)

function clearSelection() {
  table.setRowSelection({})
}

function openBatchDelete() {
  batchDeleteOpen.value = true
}

function closeBatchDelete() {
  batchDeleteOpen.value = false
}

async function confirmBatchDelete() {
  const rows = selectedRows.value.map((r) => r.original)
  if (!rows.length) return
  batchDeleteLoading.value = true
  errorMessage.value = ''
  try {
    for (const item of rows) {
      await deleteSupervisionReport(projectId.value, item.id)
    }
    closeBatchDelete()
    table.setRowSelection({})
    await load()
  } catch {
    errorMessage.value = '批次刪除失敗'
  } finally {
    batchDeleteLoading.value = false
  }
}

watch(
  projectId,
  (id) => {
    if (!id) {
      list.value = []
      loading.value = false
      return
    }
    resetTableState()
    void load()
  },
  { immediate: true }
)

const emptyText = computed(() => {
  if (!projectId.value) return '缺少專案 ID'
  const q = globalFilter.value.trim()
  if (list.value.length === 0) {
    return q ? '沒有符合條件的資料' : '尚無監造報表，請點「新增報表」建立。'
  }
  return '沒有符合條件的資料'
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <ShieldCheck class="size-5 text-primary" />
          <h1 class="text-xl font-semibold tracking-tight text-foreground">監造報表</h1>
        </div>
        <p class="mt-1 text-sm text-muted-foreground">
          公共工程監造報表；監造工程師每日填報，含施工查驗、材料品質查核、職安督導等。
        </p>
      </div>
    </div>

    <div v-if="!perm.canRead.value" class="text-sm text-muted-foreground">
      您沒有監造報表檢視權限（<code class="rounded bg-muted px-1 py-0.5 text-xs"
        >construction.supervision</code
      >）。
    </div>

    <template v-else>
      <DataTableFeatureToolbar
        v-if="!loading && projectId"
        :table="table"
        :features="TABLE_FEATURES"
        :column-labels="COLUMN_LABELS"
        :has-active-filters="hasActiveFilters"
        :global-filter="globalFilter"
        search-placeholder="搜尋日期、編號、天氣、進度…"
        @reset="resetTableState"
      >
        <template #actions>
          <div class="flex flex-wrap items-center justify-end gap-3">
            <template v-if="hasSelection">
              <span class="text-sm text-muted-foreground">已選 {{ selectedCount }} 項</span>
              <ButtonGroup>
                <Button variant="outline" size="sm" @click="clearSelection">取消選取</Button>
                <Button
                  v-if="perm.canDelete.value"
                  variant="outline"
                  size="sm"
                  class="text-destructive hover:text-destructive"
                  @click="openBatchDelete"
                >
                  批次刪除
                </Button>
              </ButtonGroup>
            </template>
            <Button
              v-if="perm.canCreate.value && !hasSelection"
              size="sm"
              variant="default"
              class="gap-2"
              as-child
            >
              <RouterLink :to="newReportPath" class="inline-flex items-center gap-2">
                <Plus class="size-4" />
                新增報表
              </RouterLink>
            </Button>
          </div>
        </template>
      </DataTableFeatureToolbar>

      <div class="rounded-lg border border-border bg-card">
        <p v-if="errorMessage" class="px-4 pt-4 text-sm text-destructive">{{ errorMessage }}</p>
        <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 class="size-8 animate-spin" />
        </div>
        <DataTableFeatureSection v-else :table="table" :empty-text="emptyText" />
      </div>
      <div v-if="!loading && projectId && list.length > 0" class="mt-4">
        <DataTablePagination :table="table" />
      </div>
    </template>

    <Dialog v-model:open="batchDeleteOpen" @update:open="(v: boolean) => !v && closeBatchDelete()">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批次刪除</DialogTitle>
          <DialogDescription>
            確定刪除已選的 {{ selectedCount }} 筆監造報表？無法復原。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="closeBatchDelete">取消</Button>
          <Button variant="destructive" :disabled="batchDeleteLoading" @click="confirmBatchDelete">
            {{ batchDeleteLoading ? '刪除中…' : '刪除' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
