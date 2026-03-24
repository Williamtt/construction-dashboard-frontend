<script setup lang="ts">
import type { ColumnDef, FilterFn } from '@tanstack/vue-table'
import { ref, computed, onMounted, watch, h } from 'vue'
import { apiClient } from '@/api/client'
import { API_PATH } from '@/constants'
import {
  fetchPlatformUsers,
  fetchTenants,
  resetUserPassword,
  type PlatformUserItem,
  type TenantItem,
} from '@/api/platform'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import DataTableColumnHeader from '@/components/common/data-table/DataTableColumnHeader.vue'
import DataTableFeatureSection from '@/components/common/data-table/DataTableFeatureSection.vue'
import DataTableFeatureToolbar from '@/components/common/data-table/DataTableFeatureToolbar.vue'
import { useClientDataTable } from '@/composables/useClientDataTable'
import type { TableListFeatures } from '@/types/data-table'
import PlatformUsersRowActions from '@/views/platform-admin/PlatformUsersRowActions.vue'
import { Loader2, Trash2 } from 'lucide-vue-next'

const list = ref<PlatformUserItem[]>([])
const tenants = ref<TenantItem[]>([])
const loading = ref(true)
const tenantsLoading = ref(true)

const ALL_TENANTS_VALUE = '__all__'
const ALL_ROLE_VALUE = '__all__'
const ALL_MEMBER_TYPE_VALUE = '__all__'
const tenantFilter = ref<string>(ALL_TENANTS_VALUE)
const systemRoleFilter = ref<string>(ALL_ROLE_VALUE)
const memberTypeFilter = ref<string>(ALL_MEMBER_TYPE_VALUE)

const TABLE_FEATURES: TableListFeatures = {
  search: true,
  filtersAndSort: true,
  columnVisibility: false,
}

const COLUMN_LABELS: Record<string, string> = {
  nameEmail: '姓名 / Email',
  systemRole: '系統角色',
  memberType: '成員類型',
  tenantName: '所屬租戶',
  createdAt: '建立日期',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function systemRoleLabel(role: string): string {
  const map: Record<string, string> = {
    platform_admin: '平台管理員',
    tenant_admin: '租戶管理員',
    project_user: '專案使用者',
  }
  return map[role] ?? role
}

function memberTypeLabel(type: string): string {
  return type === 'external' ? '外部成員' : '內部成員'
}

const platformUsersGlobalFilterFn: FilterFn<PlatformUserItem> = (row, _columnId, filterValue) => {
  const q = String(filterValue ?? '').trim().toLowerCase()
  if (!q) return true
  const u = row.original
  const dateStr = formatDate(u.createdAt).toLowerCase()
  const parts = [
    u.name ?? '',
    u.email,
    systemRoleLabel(u.systemRole).toLowerCase(),
    u.systemRole.toLowerCase(),
    memberTypeLabel(u.memberType).toLowerCase(),
    u.memberType.toLowerCase(),
    u.tenantName ?? '',
    u.createdAt?.toLowerCase() ?? '',
    u.updatedAt?.toLowerCase() ?? '',
    dateStr,
  ].map((s) => String(s).toLowerCase())
  return parts.some((x) => x.includes(q))
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

async function loadUsers() {
  loading.value = true
  try {
    const params: {
      page?: number
      limit?: number
      tenantId?: string
      systemRole?: string
      memberType?: string
    } = { page: 1, limit: 100 }
    if (tenantFilter.value && tenantFilter.value !== ALL_TENANTS_VALUE)
      params.tenantId = tenantFilter.value
    if (systemRoleFilter.value && systemRoleFilter.value !== ALL_ROLE_VALUE)
      params.systemRole = systemRoleFilter.value
    if (memberTypeFilter.value && memberTypeFilter.value !== ALL_MEMBER_TYPE_VALUE)
      params.memberType = memberTypeFilter.value
    const { list: items } = await fetchPlatformUsers(params)
    list.value = items ?? []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadTenants().then(() => loadUsers())
})

const resetPasswordDialogOpen = ref(false)
const resetPasswordUser = ref<PlatformUserItem | null>(null)
const resetPasswordNewPassword = ref('')
const resetPasswordSubmitting = ref(false)
const resetPasswordErrorMessage = ref('')

function openResetPasswordDialog(user: PlatformUserItem) {
  resetPasswordUser.value = user
  resetPasswordNewPassword.value = ''
  resetPasswordErrorMessage.value = ''
  resetPasswordDialogOpen.value = true
}

function closeResetPasswordDialog() {
  resetPasswordDialogOpen.value = false
  resetPasswordUser.value = null
  resetPasswordNewPassword.value = ''
  resetPasswordErrorMessage.value = ''
}

async function submitResetPassword() {
  const user = resetPasswordUser.value
  if (!user) return
  const newPw = resetPasswordNewPassword.value.trim()
  if (newPw.length < 6) {
    resetPasswordErrorMessage.value = '新密碼至少 6 碼'
    return
  }
  resetPasswordSubmitting.value = true
  resetPasswordErrorMessage.value = ''
  try {
    await resetUserPassword(user.id, newPw)
    closeResetPasswordDialog()
  } catch (err: unknown) {
    const res =
      err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
        : null
    resetPasswordErrorMessage.value = res?.message ?? '重設失敗'
  } finally {
    resetPasswordSubmitting.value = false
  }
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

const selectColumn: ColumnDef<PlatformUserItem, unknown> = {
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
  enableHiding: false,
}

const columns = computed<ColumnDef<PlatformUserItem, unknown>[]>(() => [
  selectColumn,
  {
    id: 'nameEmail',
    accessorFn: (row) => `${row.name ?? ''} ${row.email}`,
    meta: { label: COLUMN_LABELS.nameEmail },
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column,
        title: COLUMN_LABELS.nameEmail,
        class: 'text-foreground',
      }),
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'font-medium text-foreground' }, [
        h('span', {}, u.name || '—'),
        h('span', { class: 'block text-xs text-muted-foreground' }, u.email),
      ])
    },
    enableHiding: false,
  },
  {
    accessorKey: 'systemRole',
    id: 'systemRole',
    meta: { label: COLUMN_LABELS.systemRole },
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column,
        title: COLUMN_LABELS.systemRole,
        class: 'text-foreground',
      }),
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.systemRole === 'platform_admin' ? 'default' : 'secondary',
          class: 'font-normal',
        },
        () => systemRoleLabel(row.original.systemRole)
      ),
    enableHiding: false,
  },
  {
    accessorKey: 'memberType',
    id: 'memberType',
    meta: { label: COLUMN_LABELS.memberType },
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column,
        title: COLUMN_LABELS.memberType,
        class: 'text-foreground',
      }),
    cell: ({ row }) =>
      h(
        Badge,
        {
          variant: row.original.memberType === 'external' ? 'secondary' : 'outline',
          class: 'font-normal',
        },
        () => memberTypeLabel(row.original.memberType)
      ),
    enableHiding: false,
  },
  {
    accessorKey: 'tenantName',
    id: 'tenantName',
    meta: { label: COLUMN_LABELS.tenantName },
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column,
        title: COLUMN_LABELS.tenantName,
        class: 'text-foreground',
      }),
    cell: ({ row }) =>
      h('div', { class: 'text-muted-foreground' }, row.original.tenantName ?? '—'),
    enableHiding: false,
  },
  {
    accessorKey: 'createdAt',
    id: 'createdAt',
    meta: { label: COLUMN_LABELS.createdAt },
    header: ({ column }) =>
      h(DataTableColumnHeader, {
        column,
        title: COLUMN_LABELS.createdAt,
        class: 'text-foreground',
      }),
    cell: ({ row }) =>
      h('div', { class: 'text-sm text-muted-foreground' }, formatDate(row.original.createdAt)),
    sortingFn: 'alphanumeric',
    enableHiding: false,
  },
  {
    id: 'actions',
    header: () => '',
    cell: ({ row }) =>
      h('div', { class: 'flex justify-end' }, [
        h(PlatformUsersRowActions, {
          row: row.original,
          onResetPassword: openResetPasswordDialog,
        }),
      ]),
    enableSorting: false,
    enableHiding: false,
  },
])

const { table, globalFilter, hasActiveFilters, resetTableState } = useClientDataTable({
  data: list,
  columns,
  features: TABLE_FEATURES,
  getRowId: (row) => row.id,
  globalFilterFn: platformUsersGlobalFilterFn,
  initialPageSize: 10,
})

watch([tenantFilter, systemRoleFilter, memberTypeFilter], () => {
  resetTableState()
  void loadUsers()
})

const selectedRows = computed(() => table.getSelectedRowModel().rows)
const hasSelection = computed(() => selectedRows.value.length > 0)
const selectedCount = computed(() => selectedRows.value.length)

function hasActiveApiFilters() {
  return (
    tenantFilter.value !== ALL_TENANTS_VALUE ||
    systemRoleFilter.value !== ALL_ROLE_VALUE ||
    memberTypeFilter.value !== ALL_MEMBER_TYPE_VALUE
  )
}

const usersEmptyText = computed(() => {
  if (list.value.length === 0 && hasActiveApiFilters()) {
    return '目前篩選下尚無使用者'
  }
  return '沒有符合條件的資料'
})

const showUsersTable = computed(
  () =>
    list.value.length > 0 ||
    globalFilter.value.trim().length > 0 ||
    hasActiveApiFilters()
)

function clearSelection() {
  table.setRowSelection({})
}

async function confirmBatchDelete() {
  const ids = selectedRows.value.map((r) => r.original.id)
  if (!ids.length) return
  batchDeleteLoading.value = true
  batchDeleteError.value = ''
  try {
    for (const id of ids) {
      await apiClient.delete(`${API_PATH.PLATFORM_USERS}/${id}`)
    }
    closeBatchDelete()
    table.setRowSelection({})
    await loadUsers()
  } catch (err: unknown) {
    const res =
      err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
        : null
    batchDeleteError.value = res?.message ?? '批次刪除失敗'
  } finally {
    batchDeleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-col gap-1">
      <h1 class="text-xl font-semibold tracking-tight text-foreground">使用者總覽</h1>
      <p class="text-sm text-muted-foreground">
        檢視平台全部使用者，可依租戶、系統角色、成員類型篩選；可為使用者重設密碼。可搜尋姓名、Email、角色、類型、租戶與建立日期。
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <Select v-model="tenantFilter" :disabled="tenantsLoading">
          <SelectTrigger class="w-[160px] shrink-0 bg-background">
            <SelectValue placeholder="租戶" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_TENANTS_VALUE">全部租戶</SelectItem>
            <SelectItem v-for="t in tenants" :key="t.id" :value="t.id">
              {{ t.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="systemRoleFilter">
          <SelectTrigger class="w-[140px] shrink-0 bg-background">
            <SelectValue placeholder="系統角色" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_ROLE_VALUE">全部角色</SelectItem>
            <SelectItem value="platform_admin">平台管理員</SelectItem>
            <SelectItem value="tenant_admin">租戶管理員</SelectItem>
            <SelectItem value="project_user">專案使用者</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="memberTypeFilter">
          <SelectTrigger class="w-[140px] shrink-0 bg-background">
            <SelectValue placeholder="成員類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL_MEMBER_TYPE_VALUE">全部類型</SelectItem>
            <SelectItem value="internal">內部成員</SelectItem>
            <SelectItem value="external">外部成員</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="min-w-0 flex-1">
        <DataTableFeatureToolbar
          v-if="!loading"
          :table="table"
          :features="TABLE_FEATURES"
          :column-labels="COLUMN_LABELS"
          :has-active-filters="hasActiveFilters"
          :global-filter="globalFilter"
          search-placeholder="搜尋姓名、Email、角色、類型、租戶、建立日期…"
          @reset="resetTableState"
        >
          <template #actions>
            <div class="flex flex-wrap items-center justify-end gap-3">
              <template v-if="hasSelection">
                <span class="text-sm text-muted-foreground">已選 {{ selectedCount }} 項</span>
                <ButtonGroup>
                  <Button variant="outline" @click="clearSelection">取消選取</Button>
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
            </div>
          </template>
        </DataTableFeatureToolbar>
      </div>
    </div>

    <div class="rounded-lg border border-border bg-card p-4">
      <div v-if="loading" class="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 class="size-8 animate-spin" />
      </div>
      <DataTableFeatureSection
        v-else-if="showUsersTable"
        :table="table"
        :empty-text="usersEmptyText"
      />
      <div
        v-else
        class="flex flex-col items-center justify-center py-16 text-center text-muted-foreground"
      >
        <p class="text-sm">尚無使用者</p>
        <p class="mt-1 text-xs">變更上方篩選條件後將顯示符合的帳號。</p>
      </div>
    </div>

    <Dialog
      :open="resetPasswordDialogOpen"
      @update:open="
        (v: boolean) => {
          if (!v) closeResetPasswordDialog()
        }
      "
    >
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>重設密碼</DialogTitle>
          <DialogDescription>
            <template v-if="resetPasswordUser">
              為「{{
                resetPasswordUser.name || resetPasswordUser.email
              }}」重設登入密碼（例如忘記密碼時）。新密碼至少 6 碼。
            </template>
          </DialogDescription>
        </DialogHeader>
        <form
          v-if="resetPasswordUser"
          class="grid gap-4 py-4"
          @submit.prevent="submitResetPassword"
        >
          <div
            class="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
          >
            {{ resetPasswordUser.email }}
          </div>
          <div class="grid gap-2">
            <label for="reset-pw-new" class="text-sm font-medium text-foreground">新密碼</label>
            <Input
              id="reset-pw-new"
              v-model="resetPasswordNewPassword"
              type="password"
              placeholder="至少 6 碼"
              class="bg-background"
            />
          </div>
          <p v-if="resetPasswordErrorMessage" class="text-sm text-destructive">
            {{ resetPasswordErrorMessage }}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" @click="closeResetPasswordDialog">取消</Button>
            <Button type="submit" :disabled="resetPasswordSubmitting">
              <Loader2 v-if="resetPasswordSubmitting" class="size-4 animate-spin" />
              {{ resetPasswordSubmitting ? '重設中…' : '重設密碼' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog :open="batchDeleteOpen" @update:open="(v: boolean) => !v && closeBatchDelete()">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批次刪除使用者</DialogTitle>
          <DialogDescription>
            確定要刪除所選的 {{ selectedCount }} 位使用者？刪除後無法復原。
          </DialogDescription>
        </DialogHeader>
        <p v-if="batchDeleteError" class="text-sm text-destructive">{{ batchDeleteError }}</p>
        <DialogFooter>
          <Button variant="outline" :disabled="batchDeleteLoading" @click="closeBatchDelete">
            取消
          </Button>
          <Button variant="destructive" :disabled="batchDeleteLoading" @click="confirmBatchDelete">
            <Loader2 v-if="batchDeleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
