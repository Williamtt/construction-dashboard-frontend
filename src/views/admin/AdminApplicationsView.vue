<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  getApplications,
  approveApplication,
  rejectApplication,
  type ApplicationItem,
} from '@/api/application'
import { toast } from 'vue-sonner'

type StatusFilter = 'pending' | 'approved' | 'rejected' | ''

const list = ref<ApplicationItem[]>([])
const total = ref(0)
const page = ref(1)
const limit = 20
const loading = ref(false)
const statusFilter = ref<StatusFilter>('pending')

// 詳情 / 審核對話框
const selectedApp = ref<ApplicationItem | null>(null)
const showDetailDialog = ref(false)
const showRejectDialog = ref(false)
const rejectReason = ref('')
const processing = ref(false)

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

async function fetchList() {
  loading.value = true
  try {
    const res = await getApplications({
      status: statusFilter.value || undefined,
      page: page.value,
      limit,
    })
    list.value = res.data
    total.value = res.meta.total
  } catch (e) {
    console.error('fetchApplications', e)
    toast.error('載入申請清單失敗')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)
watch([statusFilter], () => {
  page.value = 1
  fetchList()
})
watch(page, fetchList)

function openDetail(app: ApplicationItem) {
  selectedApp.value = app
  showDetailDialog.value = true
}

async function handleApprove(app: ApplicationItem) {
  processing.value = true
  try {
    await approveApplication(app.id)
    toast.success(`已核准 ${app.name} 的申請`)
    showDetailDialog.value = false
    fetchList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    toast.error(err.response?.data?.error?.message ?? '核准失敗')
  } finally {
    processing.value = false
  }
}

function openRejectDialog(app: ApplicationItem) {
  selectedApp.value = app
  rejectReason.value = ''
  showRejectDialog.value = true
}

async function handleReject() {
  if (!selectedApp.value || !rejectReason.value.trim()) return
  processing.value = true
  try {
    await rejectApplication(selectedApp.value.id, rejectReason.value.trim())
    toast.success(`已拒絕 ${selectedApp.value.name} 的申請`)
    showRejectDialog.value = false
    showDetailDialog.value = false
    fetchList()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    toast.error(err.response?.data?.error?.message ?? '拒絕失敗')
  } finally {
    processing.value = false
  }
}

function statusLabel(s: string) {
  if (s === 'pending') return '審核中'
  if (s === 'approved') return '已核准'
  if (s === 'rejected') return '已拒絕'
  return s
}
function statusVariant(s: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'pending') return 'default'
  if (s === 'approved') return 'secondary'
  if (s === 'rejected') return 'destructive'
  return 'outline'
}
function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-foreground">帳號申請管理</h1>
    </div>

    <!-- 篩選 -->
    <div class="flex items-center gap-2">
      <Button
        v-for="f in [
          { value: 'pending', label: '審核中' },
          { value: 'approved', label: '已核准' },
          { value: 'rejected', label: '已拒絕' },
          { value: '', label: '全部' },
        ]"
        :key="f.value"
        :variant="statusFilter === f.value ? 'default' : 'outline'"
        size="sm"
        @click="statusFilter = f.value as StatusFilter"
      >
        {{ f.label }}
      </Button>
    </div>

    <!-- 表格 -->
    <Card class="border-border bg-card">
      <CardHeader>
        <CardTitle class="text-base">
          共 {{ total }} 筆申請
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex justify-center py-8">
          <span class="text-muted-foreground">載入中…</span>
        </div>
        <div v-else-if="list.length === 0" class="py-8 text-center text-muted-foreground">
          目前沒有{{ statusFilter ? statusLabel(statusFilter) + '的' : '' }}申請
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-muted-foreground">
              <th class="pb-3 pr-4 font-medium">姓名</th>
              <th class="pb-3 pr-4 font-medium">Email</th>
              <th class="pb-3 pr-4 font-medium">學號</th>
              <th class="pb-3 pr-4 font-medium">系所/班級</th>
              <th class="pb-3 pr-4 font-medium">狀態</th>
              <th class="pb-3 pr-4 font-medium">申請時間</th>
              <th class="pb-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="app in list"
              :key="app.id"
              class="border-b border-border last:border-0"
            >
              <td class="py-3 pr-4 font-medium text-foreground">{{ app.name }}</td>
              <td class="py-3 pr-4 text-muted-foreground">{{ app.email }}</td>
              <td class="py-3 pr-4">{{ app.studentId ?? '—' }}</td>
              <td class="py-3 pr-4">{{ app.department ?? '—' }}</td>
              <td class="py-3 pr-4">
                <Badge :variant="statusVariant(app.status)">
                  {{ statusLabel(app.status) }}
                </Badge>
              </td>
              <td class="py-3 pr-4 text-muted-foreground">{{ formatDate(app.createdAt) }}</td>
              <td class="py-3">
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="sm" @click="openDetail(app)">
                    檢視
                  </Button>
                  <template v-if="app.status === 'pending'">
                    <Button size="sm" @click="handleApprove(app)" :disabled="processing">
                      核准
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      @click="openRejectDialog(app)"
                      :disabled="processing"
                    >
                      拒絕
                    </Button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分頁 -->
        <div v-if="totalPages > 1" class="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="page <= 1"
            @click="page--"
          >
            上一頁
          </Button>
          <span class="text-sm text-muted-foreground">
            {{ page }} / {{ totalPages }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="page >= totalPages"
            @click="page++"
          >
            下一頁
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 詳情 Dialog -->
    <Dialog v-model:open="showDetailDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>申請詳情</DialogTitle>
          <DialogDescription>檢視帳號申請資訊</DialogDescription>
        </DialogHeader>
        <div v-if="selectedApp" class="space-y-3 text-sm">
          <div class="grid grid-cols-[100px_1fr] gap-2">
            <span class="text-muted-foreground">姓名</span>
            <span class="text-foreground">{{ selectedApp.name }}</span>
            <span class="text-muted-foreground">Email</span>
            <span class="text-foreground">{{ selectedApp.email }}</span>
            <span class="text-muted-foreground">學號</span>
            <span class="text-foreground">{{ selectedApp.studentId ?? '—' }}</span>
            <span class="text-muted-foreground">系所/班級</span>
            <span class="text-foreground">{{ selectedApp.department ?? '—' }}</span>
            <span class="text-muted-foreground">狀態</span>
            <Badge :variant="statusVariant(selectedApp.status)" class="w-fit">
              {{ statusLabel(selectedApp.status) }}
            </Badge>
            <span class="text-muted-foreground">申請時間</span>
            <span class="text-foreground">{{ formatDate(selectedApp.createdAt) }}</span>
            <template v-if="selectedApp.rejectReason">
              <span class="text-muted-foreground">拒絕原因</span>
              <span class="text-foreground">{{ selectedApp.rejectReason }}</span>
            </template>
          </div>
        </div>
        <DialogFooter v-if="selectedApp?.status === 'pending'">
          <Button
            variant="destructive"
            size="sm"
            @click="openRejectDialog(selectedApp!)"
            :disabled="processing"
          >
            拒絕
          </Button>
          <Button
            size="sm"
            @click="handleApprove(selectedApp!)"
            :disabled="processing"
          >
            核准
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 拒絕原因 Dialog -->
    <Dialog v-model:open="showRejectDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>拒絕申請</DialogTitle>
          <DialogDescription>
            拒絕 {{ selectedApp?.name }} 的帳號申請
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">拒絕原因 *</label>
          <Input
            v-model="rejectReason"
            placeholder="請說明拒絕原因"
            class="border-border bg-background text-foreground"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" @click="showRejectDialog = false">取消</Button>
          <Button
            variant="destructive"
            size="sm"
            @click="handleReject"
            :disabled="processing || !rejectReason.trim()"
          >
            確認拒絕
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
