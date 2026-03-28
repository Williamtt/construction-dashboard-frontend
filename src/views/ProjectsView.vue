<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { FolderKanban, Plus, Loader2 } from 'lucide-vue-next'
import { buildProjectPath } from '@/constants/routes'
import { useProjectStore } from '@/stores/project'
import { apiClient } from '@/api/client'
import { API_PATH } from '@/constants/api'
import { createProject } from '@/api/project'
import type { ApiResponse, ProjectItem } from '@/types'

const router = useRouter()
const projectStore = useProjectStore()

const projects = ref<ProjectItem[]>([])
const loading = ref(true)
const errorMessage = ref('')

// 新增專案
const dialogOpen = ref(false)
const form = reactive({ name: '', description: '', code: '' })
const submitting = ref(false)
const createError = ref('')

async function loadProjects() {
  loading.value = true
  errorMessage.value = ''
  try {
    const { data } = await apiClient.get<ApiResponse<ProjectItem[]>>(API_PATH.PROJECTS, {
      params: { page: 1, limit: 50 },
    })
    const list = Array.isArray(data.data) ? data.data : []
    projects.value = list
    list.forEach((p) => projectStore.setProjectName(p.id, p.name))
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    errorMessage.value = err.response?.data?.error?.message ?? '無法載入專案列表'
  } finally {
    loading.value = false
  }
}

onMounted(loadProjects)

function openProject(projectId: string, projectName: string) {
  projectStore.setProjectName(projectId, projectName)
  projectStore.setCurrentProjectId(projectId)
  router.push(buildProjectPath(projectId, '/dashboard'))
}

async function submitCreate() {
  const name = form.name.trim()
  if (!name) {
    createError.value = '請輸入專案名稱'
    return
  }
  submitting.value = true
  createError.value = ''
  try {
    const project = await createProject({
      name,
      description: form.description.trim() || undefined,
      code: form.code.trim() || undefined,
    })
    dialogOpen.value = false
    form.name = ''
    form.description = ''
    form.code = ''
    await loadProjects()
    openProject(project.id, project.name)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    createError.value = err.response?.data?.error?.message ?? '建立失敗'
  } finally {
    submitting.value = false
  }
}

function onDialogChange(open: boolean) {
  dialogOpen.value = open
  if (!open) {
    createError.value = ''
    form.name = ''
    form.description = ''
    form.code = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold tracking-tight text-foreground">專案列表</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          選擇專案後進入該專案的工作區（儀表板、監測、契約等）
        </p>
      </div>

      <Dialog :open="dialogOpen" @update:open="onDialogChange">
        <DialogTrigger as-child>
          <Button size="sm" class="gap-2">
            <Plus class="size-4" />
            新增專案
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增專案</DialogTitle>
            <DialogDescription>
              建立新專案後，您將自動成為該專案的管理者。
            </DialogDescription>
          </DialogHeader>
          <form class="grid gap-4 py-4" @submit.prevent="submitCreate">
            <div class="grid gap-2">
              <label for="create-name" class="text-sm font-medium text-foreground">專案名稱 *</label>
              <Input id="create-name" v-model="form.name" placeholder="例：北區道路改善工程" class="bg-background" />
            </div>
            <div class="grid gap-2">
              <label for="create-desc" class="text-sm font-medium text-foreground">說明（選填）</label>
              <Input id="create-desc" v-model="form.description" placeholder="專案簡述" class="bg-background" />
            </div>
            <div class="grid gap-2">
              <label for="create-code" class="text-sm font-medium text-foreground">專案代碼（選填）</label>
              <Input id="create-code" v-model="form.code" placeholder="例：PROJ-001" class="bg-background" />
            </div>
            <p v-if="createError" class="text-sm text-destructive">{{ createError }}</p>
            <DialogFooter>
              <Button type="button" variant="outline" @click="dialogOpen = false">取消</Button>
              <Button type="submit" :disabled="submitting">
                <Loader2 v-if="submitting" class="size-4 animate-spin" />
                {{ submitting ? '建立中…' : '建立' }}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>

    <p v-if="errorMessage" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>

    <div v-if="loading" class="text-sm text-muted-foreground">載入中…</div>

    <div v-else-if="projects.length === 0" class="text-center py-12 text-muted-foreground">
      <FolderKanban class="mx-auto size-12 opacity-30" />
      <p class="mt-4 text-sm">尚無專案，點擊右上角「新增專案」建立第一個專案。</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        v-for="p in projects"
        :key="p.id"
        class="cursor-pointer border-border transition-colors hover:border-primary/50 hover:bg-muted/30"
        @click="openProject(p.id, p.name)"
      >
        <CardHeader class="flex flex-row items-center gap-3 pb-2">
          <div
            class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <FolderKanban class="size-6" />
          </div>
          <div class="min-w-0 flex-1">
            <CardTitle class="text-base truncate">{{ p.name }}</CardTitle>
            <CardDescription v-if="p.description" class="truncate">
              {{ p.description }}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent class="pt-0">
          <Button variant="outline" size="sm" class="w-full"> 進入工作區 </Button>
        </CardContent>
      </Card>
    </div>

    <p v-if="!loading && !errorMessage && projects.length > 0" class="text-xs text-muted-foreground">
      專案列表依登入角色顯示：平台管理員可看全部，租戶管理員可看本租戶，專案層僅顯示被指派的專案。
    </p>
  </div>
</template>
