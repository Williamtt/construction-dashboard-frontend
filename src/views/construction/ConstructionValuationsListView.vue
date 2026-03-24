<script setup lang="ts">
import type { ColumnDef, FilterFn } from '@tanstack/vue-table'
import { computed, h, ref, watch } from 'vue'
import { useRoute, RouterLink, type RouteLocationRaw } from 'vue-router'
import { Button } from '@/components/ui/button'
import DataTableFeatureSection from '@/components/common/data-table/DataTableFeatureSection.vue'
import DataTableFeatureToolbar from '@/components/common/data-table/DataTableFeatureToolbar.vue'
import DataTablePagination from '@/components/common/data-table/DataTablePagination.vue'
import { useClientDataTable } from '@/composables/useClientDataTable'
import { buildProjectPath, ROUTE_PATH, ROUTE_NAME } from '@/constants/routes'
import { formatThousands } from '@/lib/format-number'
import {
  listAllConstructionValuations,
  type ConstructionValuationListItemDto,
} from '@/api/construction-valuations'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { Loader2, Plus } from 'lucide-vue-next'
import type { TableListFeatures } from '@/types/data-table'

const route = useRoute()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const perm = useProjectModuleActions(projectId, 'construction.valuation')

const newPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_DIARY_VALUATION_NEW)
)

const list = ref<ConstructionValuationListItemDto[]>([])
const loading = ref(true)

/** 僅全文搜尋，無分面／多欄排序／欄位顯示 */
const TABLE_FEATURES: TableListFeatures = {
  search: true,
  filtersAndSort: false,
  columnVisibility: false,
}

const COLUMN_LABELS: Record<string, string> = {
  valuationDate: '估驗日期',
  title: '標題／摘要',
  currentPeriodTotalAmount: '本次估驗金額合計',
  createdAt: '建立時間',
}

const valuationsGlobalFilterFn: FilterFn<ConstructionValuationListItemDto> = (
  row,
  _columnId,
  filterValue
) => {
  const q = String(filterValue ?? '')
    .trim()
    .toLowerCase()
  if (!q) return true
  const r = row.original
  const dateStr = (r.valuationDate ?? '').toLowerCase()
  const title = (r.title ?? '').toLowerCase()
  const remark = (r.headerRemark ?? '').toLowerCase()
  const amount = formatThousands(r.currentPeriodTotalAmount, {
    maximumFractionDigits: 2,
  }).toLowerCase()
  const createdIso = r.createdAt.toLowerCase()
  const createdLocal = new Date(r.createdAt).toLocaleString('zh-TW').toLowerCase()
  return [dateStr, title, remark, amount, createdIso, createdLocal].some((p) => p.includes(q))
}

async function load() {
  if (!projectId.value) return
  loading.value = true
  try {
    list.value = await listAllConstructionValuations(projectId.value)
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

const columns = computed<ColumnDef<ConstructionValuationListItemDto, unknown>[]>(() => [
  {
    accessorKey: 'valuationDate',
    id: 'valuationDate',
    header: () => '估驗日期',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-foreground' },
        row.original.valuationDate?.trim() || '—'
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'title',
    id: 'title',
    header: () => '標題／摘要',
    cell: ({ row }) =>
      h('span', { class: 'text-muted-foreground' }, row.original.title?.trim() || '—'),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'amount',
    header: () => '本次估驗金額合計',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-foreground' },
        formatThousands(row.original.currentPeriodTotalAmount, { maximumFractionDigits: 2 })
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    id: 'createdAt',
    header: () => '建立時間',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'text-xs text-muted-foreground tabular-nums' },
        new Date(row.original.createdAt).toLocaleString('zh-TW')
      ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'actions',
    header: () => '',
    cell: ({ row }) => {
      const to: RouteLocationRaw = {
        name: ROUTE_NAME.PROJECT_CONSTRUCTION_DIARY_VALUATION_DETAIL,
        params: { projectId: projectId.value, valuationId: row.original.id },
      }
      return h(
        RouterLink,
        {
          to,
          class: 'inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline',
        },
        () => '開啟'
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
  globalFilterFn: valuationsGlobalFilterFn,
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

const valuationsEmptyText = computed(() => {
  if (!projectId.value) return '缺少專案 ID'
  const q = globalFilter.value.trim()
  if (list.value.length === 0) {
    return q ? '沒有符合條件的資料' : '尚無估驗紀錄，請點「新增估驗」建立。'
  }
  return '沒有符合條件的資料'
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-foreground">估驗計價</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        每次估驗一筆主檔；明細可自核定 PCCES 帶入。本次可估驗數量＝上限扣除他次已估驗與本次填寫。
      </p>
    </div>

    <div v-if="!perm.canRead.value" class="text-sm text-muted-foreground">
      您沒有估驗計價檢視權限（<code class="rounded bg-muted px-1 py-0.5 text-xs"
        >construction.valuation</code
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
        search-placeholder="搜尋估驗日期、標題、備註、金額、建立時間…"
        @reset="resetTableState"
      >
        <template #actions>
          <Button v-if="perm.canCreate.value" size="sm" variant="default" class="gap-2" as-child>
            <RouterLink :to="newPath" class="inline-flex items-center gap-2">
              <Plus class="size-4" />
              新增估驗
            </RouterLink>
          </Button>
        </template>
      </DataTableFeatureToolbar>

      <div class="rounded-lg border border-border bg-card">
        <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 class="size-8 animate-spin" />
        </div>
        <DataTableFeatureSection v-else :table="table" :empty-text="valuationsEmptyText" />
      </div>
      <div v-if="!loading && projectId && list.length > 0" class="mt-4">
        <DataTablePagination :table="table" hide-selection-info />
      </div>
    </template>
  </div>
</template>
