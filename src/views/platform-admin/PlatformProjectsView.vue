<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'
import { FlexRender } from '@tanstack/vue-table'
import type { SortingState } from '@tanstack/vue-table'
import { ref, computed, onMounted, h } from 'vue'
import { valueUpdater } from '@/lib/utils'
import { apiClient } from '@/api/client'
import { API_PATH } from '@/constants'
import { fetchPlatformProjects, fetchTenants, type PlatformProjectItem, type TenantItem } from '@/api/platform'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DataTablePagination from '@/components/common/data-table/DataTablePagination.vue'
import { Loader2, Trash2 } from 'lucide-vue-next'

const list = ref<PlatformProjectItem[]>([])
const rowSelection = ref<Record<string, boolean>>({})
const tenants = ref<TenantItem[]>([])
const loading = ref(true)
const tenantsLoading = ref(true)
const ALL_TENANTS_VALUE = '__all__'
const tenantFilter = ref<string>(ALL_TENANTS_VALUE)

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function statusLabel(status: string): string {
  return status === 'archived' ? '已封存' : '使用中'
}

async function loadTenants() {
  tenantsLoading.value = true
  try {
    const { list: items } = await fetchTenants({ page: 1, limit: 200 })
    tenants.value = items ?? []
  } catch {
    tenants.value = []
  } finally {
    tenantsLoading.value = false
  }
}

async function loadProjects() {
  loading.value = true
  try {
    const params: { page?: number; limit?: number; tenantId?: string } = {
      page: 1,
      limit: 100,
    }
    if (tenantFilter.value && tenantFilter.value !== ALL_TENANTS_VALUE) params.tenantId = tenantFilter.value
    const { list: items } = await fetchPlatformProjects(params)
    list.value = items ?? []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTenants().then(() => loadProjects())
})

function onTenantFilterChange() {
  loadProjects()
}

const batchDeleteOpen = ref(false)
const batchDeleteLoading = ref(false)
const batchDeleteError = ref('')
function openBatchDelete() {
  batchDeleteError.value = ''
  batchDeleteOpen.value = true
}
function closeBatchDelete() {
  batchDeleteOpen.value = false
  batchDeleteError.value = ''
}
const sorting = ref<SortingState>([])
const columns = computed<ColumnDef<PlatformProjectItem, unknown>[]>(() => [
  {
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        checked: table.getIsAllPageRowsSelected()
          ? true
          : table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : false,
        'onUpdate:checked': (v: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!v),
        'aria-label': '全選',
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        checked: row.getIsSelected(),
        'onUpdate:checked': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        'aria-label': '選取此列',
      }),
    enableSorting: false,
  },
  {
    accessorKey: 'name',
    header: '專案名稱',
    cell: ({ row }) => {
      const p = row.original
      return h('div', { class: 'font-medium text-foreground' }, [
        h('span', {}, p.name),
        p.description
          ? h('p', { class: 'mt-0.5 truncate text-xs text-muted-foreground', title: p.description }, p.description)
          : null,
      ])
    },
  },
  {
    accessorKey: 'code',
    header: '代碼',
    cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.original.code || '—'),
  },
  {
    accessorKey: 'tenantName',
    header: '所屬租戶',
    cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.original.tenantName || '—'),
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) =>
      h(Badge, {
        variant: row.original.status === 'archived' ? 'secondary' : 'default',
        class: 'font-normal',
      }, () => statusLabel(row.original.status)),
  },
  {
    accessorKey: 'createdAt',
    header: '建立日期',
    cell: ({ row }) =>
      h('div', { class: 'text-muted-foreground text-sm' }, formatDate(row.original.createdAt)),
  },
])

const table = useVueTable({
  get data() {
    return list.value
  },
  get columns() {
    return columns.value
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  onSortingChange: (updater) => valueUpdater(updater, sorting),
  onRowSelectionChange: (updater) => valueUpdater(updater, rowSelection),
  state: {
    get sorting() {
      return sorting.value
    },
    get rowSelection() {
      return rowSelection.value
    },
  },
  getRowId: (row) => row.id,
  initialState: {
    pagination: { pageSize: 10 },
  },
})

const selectedRows = computed(() => table.getSelectedRowModel().rows)
const hasSelection = computed(() => selectedRows.value.length > 0)
const selectedCount = computed(() => selectedRows.value.length)

function clearSelection() {
  rowSelection.value = {}
}

async function confirmBatchDelete() {
  const ids = selectedRows.value.map((r) => r.original.id)
  if (!ids.length) return
  batchDeleteLoading.value = true
  batchDeleteError.value = ''
  try {
    for (const id of ids) {
      await apiClient.delete(`${API_PATH.PLATFORM_PROJECTS}/${id}`)
    }
    closeBatchDelete()
    rowSelection.value = {}
    await loadProjects()
  } catch (err: unknown) {
    const res = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
      : null
    batchDeleteError.value = res?.message ?? '批次刪除失敗'
  } finally {
    batchDeleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">專案總覽</h1>
      <p class="text-sm text-muted-foreground">
        檢視平台全部專案，可依租戶篩選。進入專案後的情境之後再規劃。
      </p>
    </div>

    <!-- 篩選列與多選工具列：表格外、表格上方 -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <Select
          v-model="tenantFilter"
          :disabled="tenantsLoading"
          @update:model-value="onTenantFilterChange"
        >
          <SelectTrigger class="w-[200px] bg-background">
            <SelectValue placeholder="全部租戶" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_TENANTS_VALUE">全部租戶</SelectItem>
            <SelectItem
              v-for="t in tenants"
              :key="t.id"
              :value="t.id"
            >
              {{ t.slug ? `${t.name}（${t.slug}）` : t.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div v-if="hasSelection" class="flex flex-wrap items-center gap-3">
        <span class="text-sm text-muted-foreground">已選 {{ selectedCount }} 項</span>
        <ButtonGroup>
          <Button variant="outline" @click="clearSelection">
            取消選取
          </Button>
          <Button
            variant="outline"
            class="text-destructive hover:text-destructive"
            @click="openBatchDelete"
          >
            <Trash2 class="size-4" />
            批次刪除
          </Button>
        </ButtonGroup>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 class="size-8 animate-spin" />
      </div>
      <template v-else>
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id">
                <FlexRender
                  v-if="!header.isPlaceholder"
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="table.getRowModel().rows?.length">
              <TableRow
                v-for="row in table.getRowModel().rows"
                :key="row.id"
                :data-state="row.getIsSelected() ? 'selected' : undefined"
              >
                <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                  <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                </TableCell>
              </TableRow>
            </template>
            <template v-else>
              <TableRow>
                <TableCell :colspan="6" class="h-24 text-center text-muted-foreground">
                  尚無專案，或目前篩選無結果。
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
        <DataTablePagination :table="table" />
      </template>
    </div>

    <Dialog :open="batchDeleteOpen" @update:open="(v: boolean) => !v && closeBatchDelete()">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批次刪除專案</DialogTitle>
          <DialogDescription>
            確定要刪除所選的 {{ selectedCount }} 個專案？刪除後無法復原。
          </DialogDescription>
        </DialogHeader>
        <p v-if="batchDeleteError" class="text-sm text-destructive">{{ batchDeleteError }}</p>
        <DialogFooter>
          <Button variant="outline" :disabled="batchDeleteLoading" @click="closeBatchDelete">取消</Button>
          <Button variant="destructive" :disabled="batchDeleteLoading" @click="confirmBatchDelete">
            <Loader2 v-if="batchDeleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
