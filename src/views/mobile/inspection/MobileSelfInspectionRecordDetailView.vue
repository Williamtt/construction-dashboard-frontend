<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2, ImageIcon, Download, AlertTriangle } from 'lucide-vue-next'
import {
  getProjectSelfInspectionRecord,
  getProjectSelfInspectionTemplateHub,
} from '@/api/project-self-inspections'
import type { SelfInspectionRecordItem } from '@/api/project-self-inspections'
import type { ProjectSelfInspectionTemplateHub } from '@/api/project-self-inspections'
import { listProjectFiles, getFileBlob } from '@/api/files'
import type { AttachmentItem } from '@/api/files'
import { useMobileSelfInspectionNavStore } from '@/stores/mobileSelfInspectionNav'
import { ROUTE_NAME } from '@/constants/routes'

defineOptions({ name: 'MobileSelfInspectionRecordDetailView' })

const route = useRoute()
const router = useRouter()
const navStore = useMobileSelfInspectionNavStore()

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
    /* silently ignore */
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
  navStore.setTemplateTitle(null)
  try {
    const rec = await getProjectSelfInspectionRecord(pid, tid, rid)
    record.value = rec
    if (rec.structureSnapshot) {
      hub.value = rec.structureSnapshot
    } else {
      hub.value = await getProjectSelfInspectionTemplateHub(pid, tid)
    }
    navStore.setTemplateTitle(hub.value?.template.name ?? null)
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

function isDefectResult(optionId: string | undefined): boolean {
  if (!optionId || !hc.value) return false
  const label = resultLabel(optionId)
  return label.includes('×') || label.includes('缺失') || label.includes('不合格')
}

function createDefect(itemId: string, itemName: string, standardText: string) {
  const h = header.value
  const itemData = items.value[itemId]
  const description = [
    itemName,
    `規範標準：${standardText}`,
    `實際情形：${itemData?.actualText?.trim() || '—'}`,
    `檢查結果：${resultLabel(itemData?.resultOptionId)}`,
  ].join('\n').slice(0, 800)
  router.push({
    name: ROUTE_NAME.MOBILE_DEFECT_NEW,
    params: { projectId: projectId.value },
    query: {
      fromInspection: '1',
      description,
      location: (h?.inspectionLocation ?? '').slice(0, 200),
      sourceRecordId: recordId.value,
      sourceItemId: itemId,
      sourceTemplateId: templateId.value,
    },
  })
}

watch(
  [projectId, templateId, recordId],
  () => {
    load()
  },
  { immediate: true }
)

onUnmounted(() => {
  navStore.setTemplateTitle(null)
})

const header = computed(() => record.value?.filledPayload?.header)
const items = computed(() => record.value?.filledPayload?.items ?? {})
</script>

<template>
  <div class="mobile-page space-y-4 px-4 pb-8 pt-2">
    <div v-if="loading" class="flex flex-col items-center py-16">
      <Loader2 class="size-8 animate-spin text-muted-foreground" aria-hidden />
      <p class="mt-2 text-sm text-muted-foreground">載入中…</p>
    </div>

    <div
      v-else-if="loadError || !record || !hub || !hc"
      class="rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive"
    >
      {{ loadError || '找不到紀錄' }}
    </div>

    <template v-else>
      <section class="rounded-xl border border-border bg-card p-4">
        <h2 class="text-lg font-semibold text-foreground">{{ hub.template.name }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">填寫時間 {{ formatDateTime(record.createdAt) }}</p>
        <p class="mt-2 text-sm text-muted-foreground">
          填寫者：
          <span class="text-foreground">{{
            record.filledBy?.name?.trim() || record.filledBy?.email || '—'
          }}</span>
        </p>

        <dl class="mt-4 space-y-3">
          <div>
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
      </section>

      <section
        v-if="photoAttachments.length"
        class="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <h3 class="flex items-center gap-1.5 text-base font-semibold text-foreground">
          <ImageIcon class="size-4" aria-hidden />
          照片附件
        </h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="a in photoAttachments"
            :key="a.id"
            type="button"
            class="flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm text-foreground touch-manipulation active:bg-muted/50 disabled:opacity-50"
            :disabled="downloadingId === a.id"
            @click="downloadPhoto(a)"
          >
            <Loader2 v-if="downloadingId === a.id" class="size-3.5 animate-spin" aria-hidden />
            <Download v-else class="size-3.5" aria-hidden />
            <span class="max-w-[200px] truncate">{{ a.fileName }}</span>
          </button>
        </div>
      </section>

      <section
        v-for="block in hub.blocks"
        :key="block.id"
        class="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <div>
          <h3 class="text-base font-semibold text-foreground">{{ block.title }}</h3>
          <p v-if="block.description" class="mt-1 text-sm text-muted-foreground">
            {{ block.description }}
          </p>
        </div>

        <div
          v-for="it in block.items"
          :key="it.id"
          class="space-y-2 rounded-lg border border-border/80 bg-background/80 p-3"
        >
          <div>
            <p class="text-xs text-muted-foreground">{{ it.categoryLabel }}</p>
            <p class="text-sm font-medium text-foreground">{{ it.itemName }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-muted-foreground">規範標準</p>
            <p class="text-sm text-foreground">{{ it.standardText }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-muted-foreground">實際情形</p>
            <p class="text-sm text-foreground">{{ items[it.id]?.actualText?.trim() || '—' }}</p>
          </div>
          <div>
            <p class="text-xs font-medium text-muted-foreground">{{ hc.resultSectionLabel }}</p>
            <p class="text-sm text-foreground">{{ resultLabel(items[it.id]?.resultOptionId) }}</p>
          </div>
          <div v-if="isDefectResult(items[it.id]?.resultOptionId)" class="pt-1">
            <button
              type="button"
              class="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-300 touch-manipulation active:bg-amber-50 dark:text-amber-400 dark:ring-amber-700"
              @click="createDefect(it.id, it.itemName, it.standardText)"
            >
              <AlertTriangle class="size-4" aria-hidden />
              建立缺失改善
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
