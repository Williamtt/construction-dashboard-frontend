<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, ImageIcon, Download, AlertTriangle } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getProjectSelfInspectionRecord,
  getProjectSelfInspectionTemplateHub,
} from '@/api/project-self-inspections'
import type { SelfInspectionRecordItem } from '@/api/project-self-inspections'
import type { ProjectSelfInspectionTemplateHub } from '@/api/project-self-inspections'
import { listProjectFiles, getFileBlob } from '@/api/files'
import type { AttachmentItem } from '@/api/files'
import { createDefectImprovement } from '@/api/defect-improvements'
import { ROUTE_NAME } from '@/constants/routes'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => (route.params.projectId as string) ?? '')
const templateId = computed(() => (route.params.templateId as string) ?? '')
const recordId = computed(() => (route.params.recordId as string) ?? '')

const loading = ref(true)
const loadError = ref('')
const record = ref<SelfInspectionRecordItem | null>(null)
const hub = ref<ProjectSelfInspectionTemplateHub | null>(null)
const photoAttachments = ref<AttachmentItem[]>([])
const downloadingId = ref<string | null>(null)

const hc = computed(() => hub.value?.template.headerConfig)

function resultLabel(optionId: string | undefined) {
  if (!optionId || !hc.value) return '—'
  const o = hc.value.resultLegendOptions.find((x) => x.id === optionId)
  return o?.label ?? optionId
}

function timingLabel(optionId: string | undefined) {
  if (!optionId || !hc.value) return '—'
  const o = hc.value.timingOptions.find((x) => x.id === optionId)
  return o?.label ?? optionId
}

function formatDateTime(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadPhotos(pid: string, ids: string[]) {
  if (!ids.length) return
  try {
    const result = await listProjectFiles({ projectId: pid, category: 'self_inspection_photo', limit: 200 })
    const idSet = new Set(ids)
    photoAttachments.value = result.data.filter((a) => idSet.has(a.id))
  } catch {
    /* photos are supplementary — silently ignore fetch errors */
  }
}

async function load() {
  const pid = projectId.value
  const tid = templateId.value
  const rid = recordId.value
  if (!pid || !tid || !rid) return
  loading.value = true
  loadError.value = ''
  record.value = null
  hub.value = null
  photoAttachments.value = []
  try {
    const rec = await getProjectSelfInspectionRecord(pid, tid, rid)
    record.value = rec
    if (rec.structureSnapshot) {
      hub.value = rec.structureSnapshot
    } else {
      hub.value = await getProjectSelfInspectionTemplateHub(pid, tid)
    }
    const photoIds = rec.filledPayload?.photoAttachmentIds ?? []
    await loadPhotos(pid, photoIds)
  } catch {
    loadError.value = '無法載入紀錄'
  } finally {
    loading.value = false
  }
}

async function downloadPhoto(a: AttachmentItem) {
  if (downloadingId.value) return
  downloadingId.value = a.id
  try {
    const { blob, fileName } = await getFileBlob(a.id, { download: true, fileName: a.fileName })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  } catch {
    /* ignore */
  } finally {
    downloadingId.value = null
  }
}

watch(
  [projectId, templateId, recordId],
  () => {
    load()
  },
  { immediate: true }
)

function goHub() {
  router.push({
    name: ROUTE_NAME.PROJECT_CONSTRUCTION_SELF_CHECK_TEMPLATE,
    params: { projectId: projectId.value, templateId: templateId.value },
  })
}

// ---- 建立缺失改善 ----

const defectDialogOpen = ref(false)
const defectFormDescription = ref('')
const defectFormDiscoveredBy = ref('')
const defectFormLocation = ref('')
const defectFormSubmitting = ref(false)
const defectFormError = ref('')
const defectSourceItemId = ref('')

function isDefectResult(optionId: string | undefined): boolean {
  if (!optionId || !hc.value) return false
  const label = resultLabel(optionId)
  return label.includes('×') || label.includes('缺失') || label.includes('不合格')
}

function openDefectDialog(itemId: string, itemName: string, standardText: string) {
  const h = header.value
  const itemData = items.value[itemId]
  defectSourceItemId.value = itemId
  defectFormDescription.value = [
    itemName,
    `規範標準：${standardText}`,
    `實際情形：${itemData?.actualText?.trim() || '—'}`,
    `檢查結果：${resultLabel(itemData?.resultOptionId)}`,
  ].join('\n').slice(0, 2000)
  defectFormLocation.value = h?.inspectionLocation?.trim() || ''
  defectFormDiscoveredBy.value = ''
  defectFormError.value = ''
  defectDialogOpen.value = true
}

async function submitDefect() {
  const desc = defectFormDescription.value.trim()
  const by = defectFormDiscoveredBy.value.trim()
  if (!desc) { defectFormError.value = '請填寫問題說明'; return }
  if (!by) { defectFormError.value = '請填寫發現人'; return }
  defectFormSubmitting.value = true
  defectFormError.value = ''
  try {
    const defect = await createDefectImprovement(projectId.value, {
      description: desc,
      discoveredBy: by,
      location: defectFormLocation.value.trim() || undefined,
      sourceType: 'self_inspection',
      sourceRecordId: recordId.value,
      sourceItemId: defectSourceItemId.value,
      sourceTemplateId: templateId.value,
    })
    defectDialogOpen.value = false
    router.push({
      name: ROUTE_NAME.PROJECT_CONSTRUCTION_DEFECT_DETAIL,
      params: { projectId: projectId.value, defectId: defect.id },
    })
  } catch (e: unknown) {
    const ax = e as { response?: { data?: { error?: { message?: string } } } }
    defectFormError.value = ax.response?.data?.error?.message ?? '建立失敗，請稍後再試'
  } finally {
    defectFormSubmitting.value = false
  }
}

const header = computed(() => record.value?.filledPayload?.header)
const items = computed(() => record.value?.filledPayload?.items ?? {})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" type="button" class="gap-1.5" @click="goHub">
        <ArrowLeft class="size-4" />
        返回紀錄列表
      </Button>
      <h1 class="text-xl font-semibold text-foreground">查驗紀錄詳情</h1>
    </div>

    <div v-if="loading" class="flex items-center gap-2 text-muted-foreground">
      <Loader2 class="size-5 animate-spin" />
      載入中…
    </div>

    <div
      v-else-if="loadError || !record || !hub || !hc"
      class="rounded-lg border border-destructive/50 bg-card px-4 py-3 text-sm text-destructive"
    >
      {{ loadError || '找不到紀錄' }}
    </div>

    <template v-else>
      <div class="rounded-lg border border-border bg-card p-4 md:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-medium text-foreground">{{ hub.template.name }}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              填寫時間 {{ formatDateTime(record.createdAt) }}
            </p>
          </div>
          <p class="text-sm text-muted-foreground">
            填寫者：
            <span class="text-foreground">{{
              record.filledBy?.name?.trim() || record.filledBy?.email || '—'
            }}</span>
          </p>
        </div>

        <dl class="mt-6 grid gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <dt class="text-xs text-muted-foreground">
              {{ hc.inspectionNameLabel?.trim() || '檢查名稱' }}
            </dt>
            <dd class="text-sm text-foreground">{{ header?.inspectionName?.trim() || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">{{ hc.projectNameLabel }}</dt>
            <dd class="text-sm text-foreground">{{ header?.projectName?.trim() || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">{{ hc.subProjectLabel }}</dt>
            <dd class="text-sm text-foreground">{{ header?.subProjectName?.trim() || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">{{ hc.subcontractorLabel }}</dt>
            <dd class="text-sm text-foreground">{{ header?.subcontractor?.trim() || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">{{ hc.inspectionLocationLabel }}</dt>
            <dd class="text-sm text-foreground">{{ header?.inspectionLocation?.trim() || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">{{ hc.inspectionDateLabel }}</dt>
            <dd class="text-sm text-foreground">{{ header?.inspectionDate?.trim() || '—' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted-foreground">{{ hc.timingSectionLabel }}</dt>
            <dd class="text-sm text-foreground">{{ timingLabel(header?.timingOptionId) }}</dd>
          </div>
        </dl>
      </div>

      <div
        v-if="photoAttachments.length"
        class="rounded-lg border border-border bg-card p-4 md:p-6"
      >
        <h2 class="mb-3 flex items-center gap-1.5 text-base font-medium text-foreground">
          <ImageIcon class="size-4" aria-hidden />
          照片附件
        </h2>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="a in photoAttachments"
            :key="a.id"
            type="button"
            class="flex items-center gap-1.5 rounded border border-border bg-muted/30 px-3 py-1.5 text-sm text-foreground underline-offset-2 hover:bg-muted/50 disabled:opacity-50"
            :disabled="downloadingId === a.id"
            @click="downloadPhoto(a)"
          >
            <Loader2 v-if="downloadingId === a.id" class="size-3.5 animate-spin" aria-hidden />
            <Download v-else class="size-3.5" aria-hidden />
            <span class="max-w-[200px] truncate">{{ a.fileName }}</span>
          </button>
        </div>
      </div>

      <div
        v-for="block in hub.blocks"
        :key="block.id"
        class="space-y-4 rounded-lg border border-border bg-card p-4 md:p-6"
      >
        <div>
          <h3 class="text-lg font-medium text-foreground">{{ block.title }}</h3>
          <p v-if="block.description" class="mt-1 text-sm text-muted-foreground">
            {{ block.description }}
          </p>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="bg-muted/30 px-3 py-2 text-left font-medium text-foreground">
                  檢查項目
                </th>
                <th class="bg-muted/30 px-3 py-2 text-left font-medium text-foreground">
                  規範標準
                </th>
                <th class="bg-muted/30 px-3 py-2 text-left font-medium text-foreground">
                  實際情形
                </th>
                <th class="bg-muted/30 px-3 py-2 text-left font-medium text-foreground">
                  {{ hc.resultSectionLabel }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="it in block.items"
                :key="it.id"
                class="border-b border-border align-top last:border-0"
              >
                <td class="px-3 py-2 text-foreground">
                  <span class="text-muted-foreground">{{ it.categoryLabel }}</span>
                  <div class="font-medium">{{ it.itemName }}</div>
                </td>
                <td class="px-3 py-2 text-muted-foreground">{{ it.standardText }}</td>
                <td class="px-3 py-2 text-foreground">
                  {{ items[it.id]?.actualText?.trim() || '—' }}
                </td>
                <td class="px-3 py-2 text-foreground">
                  <div class="flex flex-wrap items-center gap-2">
                    <span>{{ resultLabel(items[it.id]?.resultOptionId) }}</span>
                    <button
                      v-if="isDefectResult(items[it.id]?.resultOptionId)"
                      type="button"
                      class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-amber-700 ring-1 ring-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:ring-amber-700 dark:hover:bg-amber-950/30"
                      @click="openDefectDialog(it.id, it.itemName, it.standardText)"
                    >
                      <AlertTriangle class="size-3" aria-hidden />
                      建立缺失
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <Dialog v-model:open="defectDialogOpen">
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>建立缺失改善</DialogTitle>
          <DialogDescription>確認問題說明並填寫發現人，即可建立缺失紀錄。</DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <p v-if="defectFormError" class="text-sm text-destructive">{{ defectFormError }}</p>
          <div class="space-y-2">
            <Label for="df-desc">問題說明 <span class="text-destructive">*</span></Label>
            <textarea
              id="df-desc"
              v-model="defectFormDescription"
              rows="6"
              class="border-input focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[120px] w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
          </div>
          <div class="space-y-2">
            <Label for="df-by">發現人 <span class="text-destructive">*</span></Label>
            <input
              id="df-by"
              v-model="defectFormDiscoveredBy"
              type="text"
              class="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
          </div>
          <div class="space-y-2">
            <Label for="df-loc">位置（選填）</Label>
            <input
              id="df-loc"
              v-model="defectFormLocation"
              type="text"
              class="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" :disabled="defectFormSubmitting" @click="defectDialogOpen = false">取消</Button>
          <Button :disabled="defectFormSubmitting" @click="submitDefect">
            <Loader2 v-if="defectFormSubmitting" class="mr-2 size-4 animate-spin" />
            建立缺失
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
