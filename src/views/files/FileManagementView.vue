<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { listProjectFiles, deleteFile, getFileBlob } from '@/api/files'
import type { AttachmentItem } from '@/api/files'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { Upload, Loader2, Trash2, Download, FileIcon } from 'lucide-vue-next'

/** 檔案管理專用 category，與契約分開 */
const FILE_MANAGEMENT_CATEGORY = 'general'

const route = useRoute()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const { enqueueAndUpload } = useUploadQueue()

const fileList = ref<AttachmentItem[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const limit = 20

const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadInProgress = ref(false)
const deleteDialogOpen = ref(false)
const fileToDelete = ref<AttachmentItem | null>(null)
const deleteLoading = ref(false)

async function fetchList() {
  if (!projectId.value) return
  loading.value = true
  try {
    const { data, meta } = await listProjectFiles({
      projectId: projectId.value,
      page: page.value,
      limit,
      category: FILE_MANAGEMENT_CATEGORY,
    })
    fileList.value = data
    total.value = meta.total
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchList())
watch(projectId, (id) => {
  if (id) fetchList()
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function triggerAddFile() {
  fileInputRef.value?.click()
}

async function onFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  input.value = ''
  if (!files.length || !projectId.value) return
  uploadInProgress.value = true
  try {
    await Promise.allSettled(
      files.map((file) =>
        enqueueAndUpload({
          file,
          projectId: projectId.value,
          category: FILE_MANAGEMENT_CATEGORY,
          source: 'files',
        })
      )
    )
    await fetchList()
  } finally {
    uploadInProgress.value = false
  }
}

async function handleDownload(row: AttachmentItem) {
  try {
    const { blob, fileName } = await getFileBlob(row.id, { download: true, fileName: row.fileName })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    // 錯誤由 api client 或使用者處理
  }
}

function openDeleteDialog(row: AttachmentItem) {
  fileToDelete.value = row
  deleteDialogOpen.value = true
}

function closeDeleteDialog() {
  deleteDialogOpen.value = false
  fileToDelete.value = null
}

async function confirmDelete() {
  const row = fileToDelete.value
  if (!row) return
  deleteLoading.value = true
  try {
    await deleteFile(row.id)
    closeDeleteDialog()
    await fetchList()
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-xl font-semibold text-foreground">檔案管理</h1>
      <div class="flex items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          class="hidden"
          multiple
          @change="onFileInputChange"
        />
        <Button
          :disabled="uploadInProgress || !projectId"
          @click="triggerAddFile"
        >
          <Loader2 v-if="uploadInProgress" class="mr-2 size-4 animate-spin" />
          <Upload v-else class="mr-2 size-4" />
          新增檔案
        </Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>專案檔案</CardTitle>
        <CardDescription>
          此列表僅顯示「檔案管理」上傳的檔案，與契約附件分開管理。上傳狀態會顯示於右上角「檔案上傳」清單。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex items-center justify-center py-12">
          <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
        <template v-else>
          <Table v-if="fileList.length">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[40%]">檔名</TableHead>
                <TableHead>大小</TableHead>
                <TableHead>上傳者</TableHead>
                <TableHead>上傳時間</TableHead>
                <TableHead class="w-[100px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in fileList" :key="row.id">
                <TableCell class="font-medium">
                  <div class="flex items-center gap-2">
                    <FileIcon class="size-4 shrink-0 text-muted-foreground" />
                    <span class="truncate" :title="row.fileName">{{ row.fileName }}</span>
                  </div>
                </TableCell>
                <TableCell class="text-muted-foreground">{{ formatSize(row.fileSize) }}</TableCell>
                <TableCell class="text-muted-foreground">{{ row.uploaderName ?? '—' }}</TableCell>
                <TableCell class="text-muted-foreground">{{ formatDate(row.createdAt) }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-8"
                      aria-label="下載"
                      @click="handleDownload(row)"
                    >
                      <Download class="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-8 text-destructive hover:text-destructive"
                      aria-label="刪除"
                      @click="openDeleteDialog(row)"
                    >
                      <Trash2 class="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div
            v-else
            class="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"
          >
            <FileIcon class="mb-2 size-10 opacity-50" />
            <p class="text-sm">尚無檔案，點擊「新增檔案」上傳</p>
          </div>
        </template>
      </CardContent>
    </Card>

    <Dialog :open="deleteDialogOpen" @update:open="(v) => !v && closeDeleteDialog()">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>刪除檔案</DialogTitle>
          <DialogDescription>
            確定要刪除「{{ fileToDelete?.fileName }}」？此操作無法復原。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" :disabled="deleteLoading" @click="closeDeleteDialog">
            取消
          </Button>
          <Button variant="destructive" :disabled="deleteLoading" @click="confirmDelete">
            <Loader2 v-if="deleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
