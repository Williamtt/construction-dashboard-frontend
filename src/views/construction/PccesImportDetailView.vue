<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { isAxiosError } from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getCoreRowModel,
  useVueTable,
  FlexRender,
  type ColumnDef,
} from '@tanstack/vue-table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buildProjectPath, ROUTE_PATH, ROUTE_NAME } from '@/constants/routes'
import { formatEngineeringDecimal, formatThousands } from '@/lib/format-number'
import {
  getPccesImportItems,
  deletePccesImport,
  approvePccesImport,
  patchPccesImportVersionLabel,
  displayPccesVersionLabel,
  type PccesItemDto,
} from '@/api/pcces-imports'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { toast } from '@/components/ui/sonner'
import { Loader2, Trash2, FileSpreadsheet } from 'lucide-vue-next'
import { h } from 'vue'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const importId = computed(() => (route.params.importId as string) ?? '')
const perm = useProjectModuleActions(projectId, 'construction.pcces')

const loading = ref(true)
const loadError = ref('')
const summaryVersion = ref<number | null>(null)
const summaryFileName = ref('')
const summaryDocType = ref<string | null>(null)
const summaryVersionLabelRaw = ref<string | null>(null)
const editVersionLabel = ref('')
const savingVersionLabel = ref(false)
const items = ref<PccesItemDto[]>([])
const itemTotal = ref(0)
/** all 或任一 XML itemKind（後端原字串篩選） */
const kindFilter = ref<'all' | 'general' | 'mainItem' | 'formula' | 'variablePrice'>('all')

const deleteOpen = ref(false)
const deleteLoading = ref(false)
const importApprovedAt = ref<string | null>(null)
const approveLoading = ref(false)

const versionsPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_PCCES_VERSIONS)
)
const isOriginalContractVersion = computed(() => summaryVersion.value === 1)
const isExcelDerivedVersion = computed(() => summaryDocType.value === 'excel_change')

const uploadRoute = computed(() => ({
  name: ROUTE_NAME.PROJECT_CONSTRUCTION_PCCES_UPLOAD,
  params: { projectId: projectId.value },
  query: { context: isExcelDerivedVersion.value ? 'excel' : 'xml' },
}))
const excelChangeRoute = computed(() => ({
  name: ROUTE_NAME.PROJECT_CONSTRUCTION_PCCES_EXCEL_CHANGE,
  params: { projectId: projectId.value },
  query: { baseImportId: importId.value },
}))

const itemKindParam = computed(() => {
  if (kindFilter.value === 'all') return undefined
  return kindFilter.value
})

async function load() {
  if (!projectId.value || !importId.value) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await getPccesImportItems(projectId.value, importId.value, {
      all: true,
      itemKind: itemKindParam.value,
    })
    summaryVersion.value = res.import.version
    summaryFileName.value = res.import.fileName
    summaryDocType.value = res.import.documentType
    summaryVersionLabelRaw.value = res.import.versionLabel ?? null
    const v = res.import.version
    const raw = (res.import.versionLabel ?? '').trim()
    editVersionLabel.value = raw !== '' ? raw : v === 1 ? '原契約' : ''
    importApprovedAt.value = res.import.approvedAt ?? null
    items.value = res.items
    itemTotal.value = res.meta.total
  } catch {
    loadError.value = '無法載入資料，或該次匯入不存在。'
    items.value = []
    itemTotal.value = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
watch([projectId, importId], () => {
  load()
})
watch(kindFilter, () => {
  load()
})

const columns: ColumnDef<PccesItemDto>[] = [
  {
    accessorKey: 'itemNo',
    header: '項次',
  },
  {
    accessorKey: 'description',
    header: '項目及說明',
    cell: ({ row }) =>
      h('span', { class: 'line-clamp-2 max-w-[min(28rem,50vw)]' }, row.original.description),
  },
  {
    accessorKey: 'unit',
    header: '單位',
  },
  {
    accessorKey: 'quantity',
    header: '數量',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums' }, formatEngineeringDecimal(row.original.quantity)),
  },
  {
    accessorKey: 'unitPrice',
    header: '單價',
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums' }, formatEngineeringDecimal(row.original.unitPrice)),
  },
  {
    accessorKey: 'amountImported',
    header: '複價',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-muted-foreground' },
        formatEngineeringDecimal(row.original.amountImported)
      ),
  },
  {
    accessorKey: 'remark',
    header: '備註',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'line-clamp-2 max-w-[min(16rem,40vw)] text-muted-foreground' },
        row.original.remark || '—'
      ),
  },
  {
    accessorKey: 'percent',
    header: '工程費上限百分比',
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums text-muted-foreground' },
        formatThousands(row.original.percent, { maximumFractionDigits: 4 })
      ),
  },
]

const table = useVueTable({
  get data() {
    return items.value
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
})

function closeDeleteDialog() {
  deleteOpen.value = false
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function onApproveVersion() {
  if (!projectId.value || !importId.value) return
  if (!perm.canUpdate.value) {
    toast.error('您沒有核定權限')
    return
  }
  if (importApprovedAt.value) return
  approveLoading.value = true
  try {
    const updated = await approvePccesImport(projectId.value, importId.value)
    importApprovedAt.value = updated.approvedAt
    toast.success('已核定此版本')
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } })?.error?.message
      : null
    toast.error(msg ?? '核定失敗')
  } finally {
    approveLoading.value = false
  }
}

async function confirmDeleteVersion() {
  if (!projectId.value || !importId.value) return
  if (!perm.canDelete.value) {
    toast.error('您沒有刪除權限')
    return
  }
  deleteLoading.value = true
  try {
    await deletePccesImport(projectId.value, importId.value)
    toast.success('已刪除此匯入版本')
    closeDeleteDialog()
    await router.push({
      name: ROUTE_NAME.PROJECT_CONSTRUCTION_PCCES_VERSIONS,
      params: { projectId: projectId.value },
    })
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } })?.error?.message
      : null
    toast.error(msg ?? '刪除失敗')
  } finally {
    deleteLoading.value = false
  }
}

const summaryDisplayLabel = computed(() => {
  if (summaryVersion.value == null) return ''
  return displayPccesVersionLabel({
    version: summaryVersion.value,
    versionLabel: summaryVersionLabelRaw.value,
  })
})

async function saveVersionLabel() {
  if (!projectId.value || !importId.value) return
  if (!perm.canUpdate.value) {
    toast.error('您沒有修改權限')
    return
  }
  savingVersionLabel.value = true
  try {
    const updated = await patchPccesImportVersionLabel(
      projectId.value,
      importId.value,
      editVersionLabel.value.trim()
    )
    summaryVersionLabelRaw.value = updated.versionLabel
    const v = updated.version
    const raw = (updated.versionLabel ?? '').trim()
    editVersionLabel.value = raw !== '' ? raw : v === 1 ? '原契約' : ''
    toast.success('已更新版本名稱')
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } })?.error?.message
      : null
    toast.error(msg ?? '更新失敗')
  } finally {
    savingVersionLabel.value = false
  }
}

</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-6">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <Button variant="outline" as-child>
        <RouterLink :to="versionsPath">返回列表</RouterLink>
      </Button>
    </div>

    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-xl font-semibold text-foreground">PCCES 工項明細</h1>
          <span
            v-if="!loading && !loadError && summaryVersion != null"
            class="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
          >
            <template v-if="isOriginalContractVersion">原契約版</template>
            <template v-else-if="isExcelDerivedVersion">Excel 變更版</template>
            <template v-else>XML 匯入版</template>
          </span>
        </div>
        <p v-if="summaryVersion != null" class="mt-1 text-sm text-muted-foreground">
          <span class="font-medium text-foreground">{{ summaryDisplayLabel }}</span>
          <span class="text-muted-foreground"> · 第 {{ summaryVersion }} 版 · {{ summaryFileName }}</span>
          <span v-if="summaryDocType && !isExcelDerivedVersion"> · {{ summaryDocType }}</span>
          <span v-if="!loading && !loadError"> · 共 {{ itemTotal }} 筆</span>
        </p>
        <p v-if="importApprovedAt" class="mt-1 text-sm text-muted-foreground">
          已於 {{ formatDateTime(importApprovedAt) }} 核定（施工日誌可引用此版工項）。
        </p>
        <p
          v-else-if="summaryVersion != null && !loading && !loadError"
          class="mt-1 text-sm text-muted-foreground"
        >
          尚未核定。請先核定後，施工日誌始得自本版帶出工項。
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <Button v-if="perm.canCreate.value" variant="outline" size="sm" as-child>
          <RouterLink :to="excelChangeRoute" class="inline-flex items-center gap-2">
            <FileSpreadsheet class="size-4" />
            Excel 變更
          </RouterLink>
        </Button>
        <Button
          v-if="perm.canCreate.value && !isExcelDerivedVersion"
          variant="outline"
          size="sm"
          as-child
        >
          <RouterLink :to="uploadRoute">上傳新版本（XML）</RouterLink>
        </Button>
        <Button
          v-if="perm.canUpdate.value && !loading && !loadError && summaryVersion != null && !importApprovedAt"
          variant="default"
          size="sm"
          :disabled="approveLoading"
          @click="onApproveVersion"
        >
          <Loader2 v-if="approveLoading" class="mr-2 size-4 animate-spin" />
          核定此版本
        </Button>
        <Button
          v-if="perm.canDelete.value && !loading && !loadError && summaryVersion != null"
          variant="outline"
          size="sm"
          class="text-destructive hover:text-destructive"
          @click="deleteOpen = true"
        >
          <Trash2 class="mr-2 size-4" />
          刪除此版本
        </Button>
      </div>
      <p
        v-if="perm.canCreate.value && isExcelDerivedVersion && !loading && !loadError"
        class="w-full text-xs text-muted-foreground"
      >
        此版為 Excel 變更版：下一版請使用「Excel 變更」。若要改以
        <span class="text-foreground">完整 PCCES XML</span>
        新增版本，請至匯入紀錄列表右上角「新增版本」→「上傳 PCCES XML」。
      </p>
    </div>

    <Card
      v-if="perm.canRead.value && !loading && !loadError && summaryVersion != null && perm.canUpdate.value"
      class="shrink-0 border-border bg-card"
    >
      <CardHeader class="pb-3">
        <CardTitle class="text-base">版本名稱</CardTitle>
        <CardDescription>
          可隨時修改在列表與本頁顯示的名稱。第 1 版無自訂時語意為「原契約」；第 2 版起若清空並儲存，將顯示「第 N 版」。
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap items-end gap-3">
        <div class="flex min-w-[12rem] flex-1 flex-col gap-2">
          <Label for="pcces-detail-version-label">顯示名稱</Label>
          <Input
            id="pcces-detail-version-label"
            v-model="editVersionLabel"
            class="max-w-md bg-background"
            autocomplete="off"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          :disabled="savingVersionLabel"
          @click="saveVersionLabel"
        >
          <Loader2 v-if="savingVersionLabel" class="mr-2 size-4 animate-spin" />
          儲存名稱
        </Button>
      </CardContent>
    </Card>

    <Card v-if="!perm.canRead.value" class="shrink-0 border-border bg-card">
      <CardContent class="pt-6 text-sm text-muted-foreground">您沒有檢視權限。</CardContent>
    </Card>

    <template v-else>
      <Card class="min-h-0 flex-1 border-border bg-card">
        <CardHeader
          class="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <CardTitle class="text-lg">工項列表</CardTitle>
            <CardDescription>
              可依 XML itemKind 篩選（目錄層多為 mainItem；可填量之末層多為 general，亦有 formula／variablePrice
              等葉節點）。一次載入該次匯入之全部工項。
            </CardDescription>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">工項類型</span>
            <Select v-model="kindFilter">
              <SelectTrigger class="w-[10rem]">
                <SelectValue placeholder="篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="general">general</SelectItem>
                <SelectItem value="mainItem">mainItem</SelectItem>
                <SelectItem value="formula">formula</SelectItem>
                <SelectItem value="variablePrice">variablePrice</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent class="flex min-h-0 flex-1 flex-col gap-4">
          <div
            v-if="loading"
            class="flex shrink-0 items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 class="size-4 animate-spin" />
            載入中…
          </div>
          <p v-else-if="loadError" class="shrink-0 text-sm text-destructive">{{ loadError }}</p>
          <template v-else>
            <div class="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
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
                  <TableRow v-if="items.length === 0">
                    <TableCell :colspan="columns.length" class="text-center text-muted-foreground">
                      尚無資料
                    </TableCell>
                  </TableRow>
                  <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                      <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </template>
        </CardContent>
      </Card>
    </template>

    <AlertDialog :open="deleteOpen" @update:open="(v: boolean) => !v && closeDeleteDialog()">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除此匯入版本？</AlertDialogTitle>
          <AlertDialogDescription>
            將一併移除第 {{ summaryVersion }} 版的所有工項與歸檔 XML（軟刪除，後台無法復原）。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteLoading">取消</AlertDialogCancel>
          <Button variant="destructive" :disabled="deleteLoading" @click="confirmDeleteVersion">
            <Loader2 v-if="deleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
