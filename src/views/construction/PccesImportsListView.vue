<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  listPccesImports,
  deletePccesImport,
  approvePccesImport,
  type PccesImportSummary,
} from '@/api/pcces-imports'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { toast } from '@/components/ui/sonner'
import { Loader2, Plus, MoreHorizontal, Eye, Trash2, CheckCircle2 } from 'lucide-vue-next'

const route = useRoute()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const perm = useProjectModuleActions(projectId, 'construction.pcces')

const list = ref<PccesImportSummary[]>([])
const loading = ref(true)

const deleteOpen = ref(false)
const deleteTarget = ref<PccesImportSummary | null>(null)
const deleteLoading = ref(false)
const approvingId = ref<string | null>(null)

const uploadPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_PCCES_UPLOAD)
)

async function fetchList() {
  if (!projectId.value) return
  loading.value = true
  try {
    list.value = await listPccesImports(projectId.value)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchList())
watch(projectId, () => fetchList())

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openDelete(row: PccesImportSummary) {
  deleteTarget.value = row
  deleteOpen.value = true
}

function closeDeleteDialog() {
  deleteOpen.value = false
  deleteTarget.value = null
}

async function approveImport(row: PccesImportSummary) {
  if (!projectId.value) return
  if (!perm.canUpdate.value) {
    toast.error('您沒有核定權限')
    return
  }
  if (row.approvedAt) return
  approvingId.value = row.id
  try {
    await approvePccesImport(projectId.value, row.id)
    toast.success(`第 ${row.version} 版已核定`)
    await fetchList()
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } })?.error?.message
      : null
    toast.error(msg ?? '核定失敗')
  } finally {
    approvingId.value = null
  }
}

async function confirmDelete() {
  if (!projectId.value || !deleteTarget.value) return
  if (!perm.canDelete.value) {
    toast.error('您沒有刪除權限')
    return
  }
  deleteLoading.value = true
  try {
    await deletePccesImport(projectId.value, deleteTarget.value.id)
    toast.success(`已刪除第 ${deleteTarget.value.version} 版匯入`)
    closeDeleteDialog()
    await fetchList()
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } })?.error?.message
      : null
    toast.error(msg ?? '刪除失敗')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-foreground">PCCES 匯入紀錄</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        依版本新到舊排列；可刪除整次匯入（軟刪除，無法復原）。
      </p>
    </div>

    <div v-if="!perm.canRead.value" class="text-sm text-muted-foreground">
      您沒有 PCCES 匯入檢視權限（<code class="rounded bg-muted px-1 py-0.5 text-xs">construction.pcces</code>）。
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center justify-end gap-3">
        <Button v-if="perm.canCreate.value" class="gap-2" as-child>
          <RouterLink :to="uploadPath" class="inline-flex items-center gap-2">
            <Plus class="size-4" />
            上傳新版本
          </RouterLink>
        </Button>
      </div>

      <div class="rounded-lg border border-border bg-card p-4">
        <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 class="size-8 animate-spin" />
        </div>
        <div v-else-if="list.length === 0" class="text-sm text-muted-foreground">
          尚無匯入紀錄。
          <RouterLink
            v-if="perm.canCreate.value"
            :to="uploadPath"
            class="text-primary underline-offset-4 hover:underline"
          >
            前往首次匯入
          </RouterLink>
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>版本</TableHead>
              <TableHead>檔名</TableHead>
              <TableHead>類型</TableHead>
              <TableHead>筆數</TableHead>
              <TableHead>匯入時間</TableHead>
              <TableHead class="text-center">核定</TableHead>
              <TableHead class="text-end">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in list" :key="row.id">
              <TableCell class="tabular-nums font-medium">第 {{ row.version }} 版</TableCell>
              <TableCell>{{ row.fileName }}</TableCell>
              <TableCell class="text-muted-foreground">{{ row.documentType ?? '—' }}</TableCell>
              <TableCell class="tabular-nums text-sm text-muted-foreground">
                {{ row.itemCount }}（general {{ row.generalCount }}）
              </TableCell>
              <TableCell class="text-sm text-muted-foreground">{{ formatDate(row.createdAt) }}</TableCell>
              <TableCell class="text-center text-sm">
                <span v-if="row.approvedAt" class="text-muted-foreground">已核定</span>
                <span v-else class="font-medium text-foreground">待核定</span>
              </TableCell>
              <TableCell class="text-end">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-8 shrink-0" aria-label="更多">
                      <MoreHorizontal class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" class="w-44">
                    <DropdownMenuItem as-child class="cursor-pointer gap-2">
                      <RouterLink
                        :to="{
                          name: ROUTE_NAME.PROJECT_CONSTRUCTION_PCCES_VERSION_DETAIL,
                          params: { projectId, importId: row.id },
                        }"
                        class="flex items-center gap-2"
                      >
                        <Eye class="size-4" />
                        查看工項
                      </RouterLink>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      v-if="perm.canUpdate.value && !row.approvedAt"
                      class="cursor-pointer gap-2"
                      :disabled="approvingId === row.id"
                      @click="approveImport(row)"
                    >
                      <Loader2
                        v-if="approvingId === row.id"
                        class="size-4 animate-spin"
                      />
                      <CheckCircle2 v-else class="size-4" />
                      核定此版本
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      v-if="perm.canDelete.value"
                      class="cursor-pointer gap-2 text-destructive focus:text-destructive"
                      @click="openDelete(row)"
                    >
                      <Trash2 class="size-4" />
                      刪除此版本
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>

    <AlertDialog :open="deleteOpen" @update:open="(v: boolean) => !v && closeDeleteDialog()">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除此匯入版本？</AlertDialogTitle>
          <AlertDialogDescription>
            將一併移除第 {{ deleteTarget?.version }} 版的所有工項與歸檔 XML（軟刪除，後台無法復原）。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteLoading">取消</AlertDialogCancel>
          <Button variant="destructive" :disabled="deleteLoading" @click="confirmDelete">
            <Loader2 v-if="deleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
