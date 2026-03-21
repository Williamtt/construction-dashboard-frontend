<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { isAxiosError } from 'axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { buildProjectPath, ROUTE_PATH, ROUTE_NAME } from '@/constants/routes'
import { uploadPccesImport, listPccesImports } from '@/api/pcces-imports'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { toast } from '@/components/ui/sonner'
import { Loader2, Upload, ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const perm = useProjectModuleActions(projectId, 'construction.pcces')

const fileInputRef = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const submitting = ref(false)
const error = ref('')
const hasAnyImport = ref<boolean | null>(null)

const versionsPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_PCCES_VERSIONS)
)

async function checkExisting() {
  if (!projectId.value) return
  try {
    const list = await listPccesImports(projectId.value)
    hasAnyImport.value = list.length > 0
  } catch {
    hasAnyImport.value = null
  }
}

onMounted(() => checkExisting())
watch(projectId, () => checkExisting())

function pickFile() {
  fileInputRef.value?.click()
}

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const f = input.files?.[0]
  file.value = f ?? null
  error.value = ''
}

async function submit() {
  if (!projectId.value || !file.value) {
    error.value = '請選擇 XML 檔案'
    return
  }
  if (!perm.canCreate.value) {
    toast.error('您沒有匯入權限')
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const created = await uploadPccesImport(projectId.value, file.value)
    toast.success(`已匯入第 ${created.version} 版，共 ${created.itemCount} 筆工項`)
    await router.push({
      name: ROUTE_NAME.PROJECT_CONSTRUCTION_PCCES_VERSION_DETAIL,
      params: { projectId: projectId.value, importId: created.id },
    })
  } catch (e) {
    const msg = isAxiosError(e)
      ? (e.response?.data as { error?: { message?: string } })?.error?.message
      : null
    error.value = msg ?? '匯入失敗，請確認檔案為 PCCES eTender XML'
    toast.error(error.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" as-child class="text-muted-foreground">
        <RouterLink :to="versionsPath" class="inline-flex items-center gap-1">
          <ArrowLeft class="size-4" />
          匯入紀錄
        </RouterLink>
      </Button>
    </div>

    <div>
      <h1 class="text-xl font-semibold text-foreground">PCCES／XML 匯入</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        <template v-if="hasAnyImport === false"> 尚未匯入過標單，請上傳 PCCES 產出之 XML。 </template>
        <template v-else-if="hasAnyImport === true">
          可上傳新版本（例如契約變更後匯出之 XML）；每次匯入會遞增版本號。
        </template>
        <template v-else> 上傳 PCCES eTender 標單 XML（PayItem 樹狀結構）。 </template>
      </p>
    </div>

    <Card class="border-border bg-card">
      <CardHeader>
        <div class="flex items-center gap-2">
          <Upload class="size-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle class="text-lg">選擇檔案</CardTitle>
        </div>
        <CardDescription> 僅支援副檔名 .xml；檔案會解析後寫入資料庫並嘗試歸檔至檔案儲存。 </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xml,application/xml,text/xml"
          class="sr-only"
          @change="onFileChange"
        />
        <div class="space-y-2">
          <Label>XML 檔案</Label>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" :disabled="!perm.canCreate.value" @click="pickFile">
              選擇檔案
            </Button>
            <span class="text-sm text-muted-foreground">
              {{ file ? file.name : '未選擇檔案' }}
            </span>
          </div>
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <Button
          type="button"
          :disabled="!file || submitting || !perm.canCreate.value"
          @click="submit"
        >
          <Loader2 v-if="submitting" class="size-4 animate-spin" />
          <span v-if="submitting">匯入中…</span>
          <span v-else>開始匯入</span>
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
