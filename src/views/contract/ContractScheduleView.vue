<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import { ref, computed, h } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/common/data-table'
import DataTableColumnHeader from '@/components/common/data-table/DataTableColumnHeader.vue'
import ScheduleRowActions from '@/views/contract/ScheduleRowActions.vue'
import type { Column } from '@tanstack/vue-table'
import { CalendarRange, Plus, Calendar, Hash, CheckCircle } from 'lucide-vue-next'

/** 列表單筆：申請日期、類型、申請天數、核定天數、申請狀態 */
export interface ScheduleAdjustmentRow {
  id: string
  applyDate: string
  type: string
  applyDays: number
  approvedDays: number
  status: string
}

/** 類型選項 */
const TYPE_OPTIONS = [
  { value: 'extension', label: '展延' },
  { value: 'suspension', label: '停工' },
  { value: 'other', label: '其他' },
] as const

/** 申請狀態選項 */
const STATUS_OPTIONS = [
  { value: 'pending', label: '待審' },
  { value: 'approved', label: '已核定' },
  { value: 'rejected', label: '駁回' },
] as const

/** 上方摘要用假資料（之後可改為 API 或從專案資訊／列表計算） */
const summary = ref({
  totalApplyDays: 45,
  totalApprovedDays: 30,
  startDate: '2025-01-15',
  plannedEndDate: '2026-03-15',
})

/** 列表假資料 */
const list = ref<ScheduleAdjustmentRow[]>([
  { id: '1', applyDate: '2025-02-01', type: 'extension', applyDays: 15, approvedDays: 15, status: 'approved' },
  { id: '2', applyDate: '2025-03-10', type: 'extension', applyDays: 30, approvedDays: 15, status: 'approved' },
  { id: '3', applyDate: '2025-04-05', type: 'suspension', applyDays: 7, approvedDays: 0, status: 'rejected' },
  { id: '4', applyDate: '2025-05-01', type: 'extension', applyDays: 20, approvedDays: 0, status: 'pending' },
])

/** Modal 開關 */
const dialogOpen = ref(false)

/** 新增表單（僅 UI，送出後可接 API） */
const form = ref({
  applyDate: '',
  type: 'extension',
  applyDays: 0,
  approvedDays: 0,
  status: 'pending',
})

function typeLabel(value: string): string {
  return TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value
}

/** 送出新增（假寫入 list，之後改為 API） */
function submitAdd() {
  if (!form.value.applyDate.trim()) return
  list.value = [
    ...list.value,
    {
      id: String(Date.now()),
      applyDate: form.value.applyDate,
      type: form.value.type,
      applyDays: form.value.applyDays,
      approvedDays: form.value.approvedDays,
      status: form.value.status,
    },
  ]
  form.value = { applyDate: '', type: 'extension', applyDays: 0, approvedDays: 0, status: 'pending' }
  dialogOpen.value = false
}

function closeDialog() {
  dialogOpen.value = false
}

/** DataTable 欄位定義 */
const columns = computed<ColumnDef<ScheduleAdjustmentRow, unknown>[]>(() => [
  {
    accessorKey: 'applyDate',
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column: column as Column<unknown, unknown>,
        title: '申請日期',
      }),
    cell: ({ row }) =>
      h('div', { class: 'font-medium text-foreground' }, row.getValue('applyDate') as string),
  },
  {
    accessorKey: 'type',
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column: column as Column<unknown, unknown>,
        title: '類型',
      }),
    cell: ({ row }) =>
      h('div', { class: 'text-foreground' }, typeLabel(row.getValue('type') as string)),
  },
  {
    accessorKey: 'applyDays',
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column: column as Column<unknown, unknown>,
        title: '申請天數',
      }),
    cell: ({ row }) =>
      h('div', { class: 'text-right tabular-nums text-foreground' }, `${row.getValue('applyDays') as number} 天`),
  },
  {
    accessorKey: 'approvedDays',
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column: column as Column<unknown, unknown>,
        title: '核定天數',
      }),
    cell: ({ row }) =>
      h('div', { class: 'text-right tabular-nums text-foreground' }, `${row.getValue('approvedDays') as number} 天`),
  },
  {
    accessorKey: 'status',
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column: column as Column<unknown, unknown>,
        title: '申請狀態',
      }),
    cell: ({ row }) => {
      const s = row.getValue('status') as string
      const variant = s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'secondary'
      return h(Badge, { variant }, () => statusLabel(s))
    },
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right font-medium' }, '操作'),
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end' }, [
        h(ScheduleRowActions, {
          row: row.original,
          onEdit: (r) => { /* TODO: 開啟編輯 Modal 或導向 */ console.log('編輯', r) },
          onView: (r) => { /* TODO: 開啟查看或導向 */ console.log('查看', r) },
          onDelete: (r) => { /* TODO: 確認後呼叫刪除 API */ console.log('刪除', r) },
        }),
      ]),
    enableSorting: false,
  },
])
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-foreground">工期調整</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        展延／停工申請與核定紀錄，預計竣工日期依核定展延天數計算
      </p>
    </div>

    <!-- 上方摘要：申請天數、核定天數、開工時間、預計竣工日期 -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card class="border-border">
        <CardContent class="flex items-center gap-4 pt-6">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Hash class="size-6" />
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">申請天數</p>
            <p class="text-2xl font-semibold tabular-nums text-foreground">{{ summary.totalApplyDays }} 天</p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border">
        <CardContent class="flex items-center gap-4 pt-6">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle class="size-6" />
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">核定天數</p>
            <p class="text-2xl font-semibold tabular-nums text-foreground">{{ summary.totalApprovedDays }} 天</p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border">
        <CardContent class="flex items-center gap-4 pt-6">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar class="size-6" />
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">開工時間</p>
            <p class="text-lg font-semibold tabular-nums text-foreground">{{ summary.startDate }}</p>
          </div>
        </CardContent>
      </Card>
      <Card class="border-border">
        <CardContent class="flex items-center gap-4 pt-6">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarRange class="size-6" />
          </div>
          <div>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">預計竣工日期</p>
            <p class="text-lg font-semibold tabular-nums text-foreground">{{ summary.plannedEndDate }}</p>
            <p class="text-xs text-muted-foreground">依核定展延天數計算</p>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 列表 + 新增按鈕 -->
    <Card class="border-border">
      <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <CardTitle class="text-base">工期調整紀錄</CardTitle>
          <p class="text-sm text-muted-foreground">申請日期、類型、申請／核定天數與狀態</p>
        </div>
        <Dialog v-model:open="dialogOpen">
          <DialogTrigger as-child>
            <Button class="gap-2">
              <Plus class="size-4" />
              新增
            </Button>
          </DialogTrigger>
          <DialogContent class="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新增工期調整</DialogTitle>
              <DialogDescription>
                填寫申請日期、類型、申請天數與核定天數，申請狀態可選待審／已核定／駁回。
              </DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground">申請日期</label>
                <Input v-model="form.applyDate" type="date" placeholder="請選擇日期" />
              </div>
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground">類型</label>
                <Select v-model="form.type">
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇類型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in TYPE_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <label class="text-sm font-medium text-foreground">申請天數</label>
                  <Input v-model.number="form.applyDays" type="number" min="0" placeholder="0" />
                </div>
                <div class="grid gap-2">
                  <label class="text-sm font-medium text-foreground">核定天數</label>
                  <Input v-model.number="form.approvedDays" type="number" min="0" placeholder="0" />
                </div>
              </div>
              <div class="grid gap-2">
                <label class="text-sm font-medium text-foreground">申請狀態</label>
                <Select v-model="form.status">
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇狀態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in STATUS_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" @click="closeDialog">
                取消
              </Button>
              <Button @click="submitAdd">
                送出
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DataTable
          :columns="columns"
          :data="list"
          :show-view-options="false"
          :page-size="10"
        />
      </CardContent>
    </Card>
  </div>
</template>
