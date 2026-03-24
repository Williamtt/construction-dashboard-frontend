<script setup lang="ts">
import type { ColumnDef, FilterFn } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useRoute, RouterLink, type RouteLocationRaw } from 'vue-router'
import { Button } from '@/components/ui/button'
import DataTableColumnHeader from '@/components/common/data-table/DataTableColumnHeader.vue'
import DataTableFeatureSection from '@/components/common/data-table/DataTableFeatureSection.vue'
import DataTableFeatureToolbar from '@/components/common/data-table/DataTableFeatureToolbar.vue'
import DataTablePagination from '@/components/common/data-table/DataTablePagination.vue'
import { useClientDataTable } from '@/composables/useClientDataTable'
import { buildProjectPath, ROUTE_PATH, ROUTE_NAME } from '@/constants/routes'
import { CONSTRUCTION_DAILY_LOG_BREADCRUMB_STATE_KEY } from '@/lib/construction-daily-log-breadcrumb'
import { formatThousands } from '@/lib/format-number'
import {
  listAllConstructionDailyLogs,
  type ConstructionDailyLogListItemDto,
} from '@/api/construction-daily-logs'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { Loader2, Plus } from 'lucide-vue-next'
import type { TableListFeatures } from '@/types/data-table'

const route = useRoute()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const perm = useProjectModuleActions(projectId, 'construction.diary')

const list = ref<ConstructionDailyLogListItemDto[]>([])
const loading = ref(true)

/** 全文搜尋 + 填表日期區間；無欄位顯示開關；保留表頭排序（填表日期） */
const TABLE_FEATURES: TableListFeatures = {
  search: true,
  filtersAndSort: true,
  columnVisibility: false,
}

const COLUMN_LABELS: Record<string, string> = {
  logDate: '填表日期',
  reportNo: '表報編號',
  plannedProgress: '預定進度（%）',
  actualProgress: '實際進度（%）',
}

const diaryGlobalFilterFn: FilterFn<ConstructionDailyLogListItemDto> = (
  row,
  _columnId,
  filterValue
) => {
  const q = String(filterValue ?? '')
    .trim()
    .toLowerCase()
  if (!q) return true
  const r = row.original
  const planned =
    r.plannedProgress == null
      ? ''
      : formatThousands(r.plannedProgress, { maximumFractionDigits: 2 })
  const actual = (r.actualProgress ?? '').toLowerCase()
  const parts = [
    r.logDate,
    r.reportNo ?? '',
    r.weatherAm ?? '',
    r.weatherPm ?? '',
    r.projectName ?? '',
    planned.toLowerCase(),
    actual,
  ].map((s) => String(s).toLowerCase())
  return parts.some((p) => p.includes(q))
}

async function load() {
  if (!projectId.value) return
  loading.value = true
  try {
    list.value = await listAllConstructionDailyLogs(projectId.value)
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function weatherBrief(row: ConstructionDailyLogListItemDto) {
  const a = row.weatherAm?.trim()
  const p = row.weatherPm?.trim()
  if (a && p) return `${a}／${p}`
  return a || p || '—'
}

const newLogPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_DIARY_LOG_NEW)
)

const columns = computed<ColumnDef<ConstructionDailyLogListItemDto, unknown>[]>(() => [
  {
    accessorKey: 'logDate',
    id: 'logDate',
    header: ({ column }) =>
      h(DataTableColumnHeader, { column, title: '填表日期', class: 'text-foreground' }),
    meta: {
      label: '填表日期',
      searchable: true,
      filter: { type: 'dateRange', title: '填表日期' },
    },
    filterFn: (row, _columnId, raw) => {
      const v = raw as { from?: string; to?: string } | undefined
      if (!v?.from && !v?.to) return true
      const logDate = row.original.logDate
      if (v.from && logDate < v.from) return false
      if (v.to && logDate > v.to) return false
      return true
    },
    sortingFn: 'alphanumeric',
    cell: ({ row }) => h('span', { class: 'tabular-nums text-foreground' }, row.original.logDate),
    enableHiding: false,
  },
  {
    accessorKey: 'reportNo',
    id: 'reportNo',
    header: () => '表報編號',
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
    accessorKey: 'plannedProgress',
    id: 'plannedProgress',
    header: () => '預定進度（%）',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-muted-foreground' },
        row.original.plannedProgress == null
          ? '—'
          : formatThousands(row.original.plannedProgress, { maximumFractionDigits: 2 })
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'actualProgress',
    id: 'actualProgress',
    header: () => '實際進度（%）',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-foreground' },
        row.original.actualProgress == null
          ? '—'
          : formatThousands(row.original.actualProgress, { maximumFractionDigits: 2 })
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: () => '',
    cell: ({ row }) => {
      const to: RouteLocationRaw = {
        name: ROUTE_NAME.PROJECT_CONSTRUCTION_DIARY_LOG_DETAIL,
        params: { projectId: projectId.value, logId: row.original.id },
        state: { [CONSTRUCTION_DAILY_LOG_BREADCRUMB_STATE_KEY]: row.original.logDate },
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
  globalFilterFn: diaryGlobalFilterFn,
  enableRowSelection: false,
  initialPageSize: 20,
})

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

const logsEmptyText = computed(() => {
  if (!projectId.value) return '缺少專案 ID'
  const q = globalFilter.value.trim()
  if (list.value.length === 0) {
    return q ? '沒有符合條件的資料' : '尚無日誌，請點「新增日誌」建立。'
  }
  return '沒有符合條件的資料'
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-foreground">施工日誌</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        公共工程依附表四格式；同一專案同一填表日期僅能一筆。支援全文搜尋，並可透過工具列「填表日期」設定起迄日做區間篩選。
      </p>
    </div>

    <div v-if="!perm.canRead.value" class="text-sm text-muted-foreground">
      您沒有施工日誌檢視權限（<code class="rounded bg-muted px-1 py-0.5 text-xs"
        >construction.diary</code
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
        search-placeholder="搜尋日期、表報編號、天氣、進度…"
        @reset="resetTableState"
      >
        <template #actions>
          <Button v-if="perm.canCreate.value" size="sm" variant="default" class="gap-2" as-child>
            <RouterLink :to="newLogPath" class="inline-flex items-center gap-2">
              <Plus class="size-4" />
              新增日誌
            </RouterLink>
          </Button>
        </template>
      </DataTableFeatureToolbar>

      <div class="rounded-lg border border-border bg-card">
        <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 class="size-8 animate-spin" />
        </div>
        <DataTableFeatureSection v-else :table="table" :empty-text="logsEmptyText" />
      </div>
      <div v-if="!loading && projectId && list.length > 0" class="mt-4">
        <DataTablePagination :table="table" hide-selection-info />
      </div>
    </template>
  </div>
</template>
