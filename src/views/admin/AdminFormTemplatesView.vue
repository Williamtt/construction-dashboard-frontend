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
import { ref, onMounted, computed, h } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { valueUpdater } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DataTablePagination from '@/components/common/data-table/DataTablePagination.vue'
import AdminFormTemplatesRowActions from '@/views/admin/AdminFormTemplatesRowActions.vue'
import {
  listDefaultFormTemplates,
  createDefaultFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getFormTemplateBlob,
} from '@/api/form-templates'
import type { FormTemplateItem } from '@/api/form-templates'
import { Upload, Loader2, Trash2, Download, FileText } from 'lucide-vue-next'

const authStore = useAuthStore()
const tenantId = computed(() => authStore.user?.tenantId ?? null)

const list = ref<FormTemplateItem[]>([])
const loading = ref(true)
const rowSelection = ref<Record<string, boolean>>({})
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const addDialogOpen = ref(false)
const addForm = ref({ name: '', description: '', file: null as File | null })
const addLoading = ref(false)
const addError = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const editDialogOpen = ref(false)
const editTarget = ref<FormTemplateItem | null>(null)
const editForm = ref({ name: '', description: '' })
const editLoading = ref(false)

const deleteDialogOpen = ref(false)
const deleteTarget = ref<FormTemplateItem | null>(null)
const deleteLoading = ref(false)

async function fetchList() {
  if (!tenantId.value) return
  loading.value = true
  try {
    list.value = await listDefaultFormTemplates(tenantId.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchList())

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openAdd() {
  addForm.value = { name: '', description: '', file: null }
  addError.value = ''
  addDialogOpen.value = true
}

function onAddFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) addForm.value.file = file
  input.value = ''
}

async function submitAdd() {
  if (!addForm.value.file || !tenantId.value) {
    addError.value = '請選擇檔案'
    return
  }
  addLoading.value = true
  addError.value = ''
  try {
    await createDefaultFormTemplate({
      file: addForm.value.file,
      name: addForm.value.name.trim() || addForm.value.file.name,
      description: addForm.value.description.trim() || undefined,
      tenantId: tenantId.value,
    })
    addDialogOpen.value = false
    await fetchList()
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
      : '新增失敗'
    addError.value = msg ?? '新增失敗'
  } finally {
    addLoading.value = false
  }
}

function openEdit(row: FormTemplateItem) {
  editTarget.value = row
  editForm.value = { name: row.name, description: row.description ?? '' }
  editDialogOpen.value = true
}

async function submitEdit() {
  if (!editTarget.value) return
  editLoading.value = true
  try {
    await updateFormTemplate(editTarget.value.id, {
      name: editForm.value.name.trim() || undefined,
      description: editForm.value.description.trim() || null,
    })
    editDialogOpen.value = false
    await fetchList()
  } finally {
    editLoading.value = false
  }
}

function openDelete(row: FormTemplateItem) {
  deleteTarget.value = row
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await deleteFormTemplate(deleteTarget.value.id)
    deleteDialogOpen.value = false
    await fetchList()
  } finally {
    deleteLoading.value = false
  }
}

async function handleDownload(row: FormTemplateItem) {
  try {
    const { blob, fileName } = await getFormTemplateBlob(row.id, { fileName: row.fileName })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

const batchDeleteOpen = ref(false)
const batchDeleteLoading = ref(false)
function openBatchDelete() {
  batchDeleteOpen.value = true
}
function closeBatchDelete() {
  if (!batchDeleteLoading.value) batchDeleteOpen.value = false
}
const sorting = ref<SortingState>([])
const columns = computed<ColumnDef<FormTemplateItem, unknown>[]>(() => [
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
    header: '名稱',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2 font-medium' }, [
        h(FileText, { class: 'size-4 shrink-0 text-muted-foreground' }),
        h('span', { class: 'truncate', title: row.original.name }, row.original.name),
      ]),
  },
  {
    accessorKey: 'description',
    header: '描述',
    cell: ({ row }) =>
      h('div', {
        class: 'text-muted-foreground max-w-[200px] truncate',
        title: row.original.description ?? '',
      }, row.original.description || '—'),
  },
  {
    accessorKey: 'fileSize',
    header: '檔案大小',
    cell: ({ row }) =>
      h('div', { class: 'text-muted-foreground text-sm' }, formatSize(row.original.fileSize ?? 0)),
  },
  {
    accessorKey: 'fileName',
    header: '檔名',
    cell: ({ row }) =>
      h('div', { class: 'text-muted-foreground text-sm' }, row.original.fileName),
  },
  {
    accessorKey: 'updatedAt',
    header: '更新時間',
    cell: ({ row }) =>
      h('div', { class: 'text-muted-foreground text-sm' }, formatDate(row.original.updatedAt)),
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'w-[80px]' }),
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end' }, [
        h(AdminFormTemplatesRowActions, {
          row: row.original,
          onDownload: handleDownload,
          onEdit: openEdit,
          onDelete: openDelete,
        }),
      ]),
    enableSorting: false,
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
  if (ids.length === 0) return
  batchDeleteLoading.value = true
  try {
    for (const id of ids) {
      await deleteFormTemplate(id)
    }
    closeBatchDelete()
    rowSelection.value = {}
    await fetchList()
  } finally {
    batchDeleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold text-foreground">表單樣板</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        在此新增的樣板會成為「預設樣板」，專案內「相關表單」頁面可看到並下載；專案也可自行新增樣板。
      </p>
    </div>

    <!-- 工具列：已選 + ButtonGroup + 新增 全部靠右（表格上方） -->
    <div class="flex flex-wrap items-center justify-end gap-3">
      <template v-if="hasSelection">
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
      </template>
      <Button :disabled="!tenantId" @click="openAdd">
        <Upload class="mr-2 size-4" />
        新增預設樣板
      </Button>
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
                <TableCell :colspan="7" class="h-24 text-center text-muted-foreground">
                  尚無預設樣板，點擊「新增預設樣板」上傳
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
        <DataTablePagination :table="table" />
      </template>
    </div>

    <!-- 新增 Dialog -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods,image/*"
      @change="onAddFileChange"
    />
    <Dialog :open="addDialogOpen" @update:open="(v) => (addDialogOpen = v)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增預設樣板</DialogTitle>
          <DialogDescription>上傳檔案並填寫名稱與描述，專案內「相關表單」會顯示此樣板</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4 py-2" @submit.prevent="submitAdd">
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground">檔案</label>
            <Button type="button" variant="outline" class="w-full" @click="fileInputRef?.click()">
              {{ addForm.file ? addForm.file.name : '選擇檔案' }}
            </Button>
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground">名稱</label>
            <Input
              v-model="addForm.name"
              placeholder="例：工程變更申請表"
              class="bg-background"
            />
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground">描述</label>
            <Input
              v-model="addForm.description"
              placeholder="簡短說明樣板用途"
              class="bg-background"
            />
          </div>
          <p v-if="addError" class="text-sm text-destructive">{{ addError }}</p>
          <DialogFooter>
            <Button type="button" variant="outline" @click="addDialogOpen = false">取消</Button>
            <Button type="submit" :disabled="addLoading || !addForm.file">
              <Loader2 v-if="addLoading" class="mr-2 size-4 animate-spin" />
              新增
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- 編輯 Dialog -->
    <Dialog :open="editDialogOpen" @update:open="(v) => (editDialogOpen = v)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯樣板</DialogTitle>
          <DialogDescription>更新名稱與描述，檔案不變</DialogDescription>
        </DialogHeader>
        <form class="grid gap-4 py-2" @submit.prevent="submitEdit">
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground">名稱</label>
            <Input v-model="editForm.name" class="bg-background" />
          </div>
          <div class="grid gap-2">
            <label class="text-sm font-medium text-foreground">描述</label>
            <Input v-model="editForm.description" class="bg-background" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" @click="editDialogOpen = false">取消</Button>
            <Button type="submit" :disabled="editLoading">
              <Loader2 v-if="editLoading" class="mr-2 size-4 animate-spin" />
              儲存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- 刪除確認 -->
    <Dialog :open="deleteDialogOpen" @update:open="(v) => (deleteDialogOpen = v)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>刪除樣板</DialogTitle>
          <DialogDescription>
            確定要刪除「{{ deleteTarget?.name }}」？此操作無法復原。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" :disabled="deleteLoading" @click="deleteDialogOpen = false">取消</Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="confirmDelete">
            <Loader2 v-if="deleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 批次刪除確認 -->
    <Dialog :open="batchDeleteOpen" @update:open="(v) => !v && closeBatchDelete()">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批次刪除樣板</DialogTitle>
          <DialogDescription>
            確定要刪除所選的 {{ selectedCount }} 個樣板？此操作無法復原。
          </DialogDescription>
        </DialogHeader>
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
