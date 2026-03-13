<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  listDefaultFormTemplates,
  createDefaultFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
  getFormTemplateBlob,
} from '@/api/form-templates'
import type { FormTemplateItem } from '@/api/form-templates'
import { Upload, Loader2, Trash2, Download, FileText, Pencil } from 'lucide-vue-next'

const authStore = useAuthStore()
const tenantId = computed(() => authStore.user?.tenantId ?? null)

const list = ref<FormTemplateItem[]>([])
const loading = ref(true)

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
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold text-foreground">表單樣板</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          在此新增的樣板會成為「預設樣板」，專案內「相關表單」頁面可看到並下載；專案也可自行新增樣板。
        </p>
      </div>
      <Button :disabled="!tenantId" @click="openAdd">
        <Upload class="mr-2 size-4" />
        新增預設樣板
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>預設樣板列表</CardTitle>
        <CardDescription>名稱、描述與更新時間，讓使用者清楚辨識每個樣板用途</CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex justify-center py-12">
          <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
        <template v-else>
          <Table v-if="list.length">
            <TableHeader>
              <TableRow>
                <TableHead class="w-[22%]">名稱</TableHead>
                <TableHead class="w-[28%]">描述</TableHead>
                <TableHead>檔名</TableHead>
                <TableHead>更新時間</TableHead>
                <TableHead class="w-[140px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in list" :key="row.id">
                <TableCell class="font-medium">{{ row.name }}</TableCell>
                <TableCell class="text-muted-foreground max-w-[200px] truncate" :title="row.description ?? ''">
                  {{ row.description || '—' }}
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">{{ row.fileName }}</TableCell>
                <TableCell class="text-muted-foreground text-sm">{{ formatDate(row.updatedAt) }}</TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" class="size-8" aria-label="下載" @click="handleDownload(row)">
                      <Download class="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="size-8" aria-label="編輯" @click="openEdit(row)">
                      <Pencil class="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-8 text-destructive hover:text-destructive"
                      aria-label="刪除"
                      @click="openDelete(row)"
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
            <FileText class="mb-2 size-10 opacity-50" />
            <p class="text-sm">尚無預設樣板，點擊「新增預設樣板」上傳</p>
          </div>
        </template>
      </CardContent>
    </Card>

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
  </div>
</template>
