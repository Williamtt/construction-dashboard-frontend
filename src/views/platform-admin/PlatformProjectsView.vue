<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchPlatformProjects, fetchTenants, type PlatformProjectItem, type TenantItem } from '@/api/platform'
import { Card, CardContent } from '@/components/ui/card'
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
import { Loader2, FolderKanban } from 'lucide-vue-next'

const list = ref<PlatformProjectItem[]>([])
const selectedProjectIds = ref<Set<string>>(new Set())
const isAllProjectsSelected = computed(() => list.value.length > 0 && selectedProjectIds.value.size === list.value.length)
const isSomeProjectsSelected = computed(() => selectedProjectIds.value.size > 0)
function toggleAllProjects(checked: boolean) {
  if (checked) list.value.forEach((p) => selectedProjectIds.value.add(p.id))
  else selectedProjectIds.value.clear()
  selectedProjectIds.value = new Set(selectedProjectIds.value)
}
function toggleProject(id: string, checked: boolean) {
  if (checked) selectedProjectIds.value.add(id)
  else selectedProjectIds.value.delete(id)
  selectedProjectIds.value = new Set(selectedProjectIds.value)
}
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
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">專案總覽</h1>
      <p class="text-sm text-muted-foreground">
        檢視平台全部專案，可依租戶篩選。進入專案後的情境之後再規劃。
      </p>
    </div>

    <!-- 篩選列：獨立 div，不包在 Card 內 -->
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
    </div>

    <Card class="border-border bg-card">
      <CardContent class="p-4">
        <div v-if="loading" class="flex items-center justify-center py-16">
          <Loader2 class="size-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="!list.length" class="py-16 text-center text-sm text-muted-foreground">
          <FolderKanban class="mx-auto mb-2 size-10 opacity-50" />
          <p>尚無專案，或目前篩選無結果。</p>
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow class="border-border hover:bg-transparent">
              <TableHead class="w-10">
                <Checkbox
                  :checked="isAllProjectsSelected || (isSomeProjectsSelected && 'indeterminate')"
                  aria-label="全選"
                  @update:checked="(v: boolean | 'indeterminate') => toggleAllProjects(v === true)"
                />
              </TableHead>
              <TableHead class="text-foreground">專案名稱</TableHead>
              <TableHead class="text-muted-foreground">代碼</TableHead>
              <TableHead class="text-muted-foreground">所屬租戶</TableHead>
              <TableHead class="text-muted-foreground">狀態</TableHead>
              <TableHead class="text-muted-foreground">建立日期</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="p in list"
              :key="p.id"
              class="border-border"
            >
              <TableCell class="w-10">
                <Checkbox
                  :checked="selectedProjectIds.has(p.id)"
                  :aria-label="'選取 ' + p.name"
                  @update:checked="(v: boolean | 'indeterminate') => toggleProject(p.id, v === true)"
                />
              </TableCell>
              <TableCell class="font-medium text-foreground">
                <div>
                  <span>{{ p.name }}</span>
                  <p
                    v-if="p.description"
                    class="mt-0.5 truncate text-xs text-muted-foreground"
                    :title="p.description"
                  >
                    {{ p.description }}
                  </p>
                </div>
              </TableCell>
              <TableCell class="text-muted-foreground">
                {{ p.code || '—' }}
              </TableCell>
              <TableCell class="text-muted-foreground">
                {{ p.tenantName || '—' }}
              </TableCell>
              <TableCell>
                <Badge :variant="p.status === 'archived' ? 'secondary' : 'default'" class="font-normal">
                  {{ statusLabel(p.status) }}
                </Badge>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">
                {{ formatDate(p.createdAt) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
