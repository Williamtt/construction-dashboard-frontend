<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ROUTE_NAME } from '@/constants/routes'
import {
  getSupervisionReport,
  getSupervisionReportDefaults,
  getSupervisionReportPccesWorkItems,
  createSupervisionReport,
  updateSupervisionReport,
  getSupervisionReportExcelUrl,
  type SupervisionReportDto,
  type SupervisionReportUpsertPayload,
  type SupervisionReportPccesPickerRow,
} from '@/api/supervision-reports'
import { apiClient } from '@/api/client'
import { ArrowLeft, Download, Loader2, Plus, ShieldCheck, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const reportId = computed(() => (route.params.reportId as string) ?? '')
const isNew = computed(() => route.name === ROUTE_NAME.PROJECT_CONSTRUCTION_SUPERVISION_NEW)

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// ── 表頭 ──
const reportNo = ref('')
const weatherAm = ref('')
const weatherPm = ref('')
const reportDate = ref('')
const projectName = ref('')
const contractDuration = ref<number | undefined>(undefined)
const startDate = ref('')
const plannedCompletionDate = ref('')
const actualCompletionDate = ref('')
const contractChangeCount = ref<number | undefined>(undefined)
const extensionDays = ref<number | undefined>(undefined)
const originalContractAmount = ref('')
const designFee = ref('')
const contractTotal = ref('')

// ── 進度 ──
const constructionPlannedProgress = ref<number | undefined>(undefined)
const constructionActualProgress = ref<number | undefined>(undefined)
const overallPlannedProgress = ref<number | undefined>(undefined)
const overallActualProgress = ref<number | undefined>(undefined)

// ── 一、工程進行情況（工作項目）──
type WorkItemRow = {
  pccesItemId?: string
  itemNo?: string
  workItemName: string
  unit: string
  contractQty: string
  dailyCompletedQty: string
  accumulatedCompletedQty: string
  remark: string
}
const workItems = ref<WorkItemRow[]>([])

// ── 二、施工查驗 ──
type InspectionRow = {
  category: 'random_check' | 'civil' | 'mep' | 'deficiency'
  description: string
}
const inspections = ref<InspectionRow[]>([])
const inspectionNotes = ref('')

// ── 三、材料查核 ──
type MaterialCheckRow = {
  category: 'incoming' | 'secondary' | 'joint'
  description: string
  referenceNo: string
}
const materialChecks = ref<MaterialCheckRow[]>([])
const materialQualityNotes = ref('')

// ── 四、職安衛生 ──
const preWorkCheckCompleted = ref(false)
const safetyNotes = ref('')

// ── 五、其他 ──
const otherSupervisionNotes = ref('')
const supervisorSigned = ref(false)

// ── PCCES picker ──
const pccesPickerOpen = ref(false)
const pccesItems = ref<SupervisionReportPccesPickerRow[]>([])
const pccesLoading = ref(false)
const pccesSearch = ref('')

const INSPECTION_CATEGORIES = [
  { value: 'random_check' as const, label: '施工不定期抽查' },
  { value: 'civil' as const, label: '土建施工查驗' },
  { value: 'mep' as const, label: '機電施工查驗' },
  { value: 'deficiency' as const, label: '施工不合格缺失' },
]

const MATERIAL_CATEGORIES = [
  { value: 'incoming' as const, label: '材料進場(取樣送驗)' },
  { value: 'secondary' as const, label: '二級抽驗' },
  { value: 'joint' as const, label: '材料會驗' },
]

function fillFromDto(dto: SupervisionReportDto) {
  reportNo.value = dto.reportNo ?? ''
  weatherAm.value = dto.weatherAm ?? ''
  weatherPm.value = dto.weatherPm ?? ''
  reportDate.value = dto.reportDate
  projectName.value = dto.projectName
  contractDuration.value = dto.contractDuration ?? undefined
  startDate.value = dto.startDate ?? ''
  plannedCompletionDate.value = dto.plannedCompletionDate ?? ''
  actualCompletionDate.value = dto.actualCompletionDate ?? ''
  contractChangeCount.value = dto.contractChangeCount ?? undefined
  extensionDays.value = dto.extensionDays ?? undefined
  originalContractAmount.value = dto.originalContractAmount ?? ''
  designFee.value = dto.designFee ?? ''
  contractTotal.value = dto.contractTotal ?? ''
  constructionPlannedProgress.value = dto.constructionPlannedProgress
    ? Number(dto.constructionPlannedProgress)
    : undefined
  constructionActualProgress.value = dto.constructionActualProgress
    ? Number(dto.constructionActualProgress)
    : undefined
  overallPlannedProgress.value = dto.overallPlannedProgress
    ? Number(dto.overallPlannedProgress)
    : undefined
  overallActualProgress.value = dto.overallActualProgress
    ? Number(dto.overallActualProgress)
    : undefined
  inspectionNotes.value = dto.inspectionNotes
  materialQualityNotes.value = dto.materialQualityNotes
  preWorkCheckCompleted.value = dto.preWorkCheckCompleted
  safetyNotes.value = dto.safetyNotes
  otherSupervisionNotes.value = dto.otherSupervisionNotes
  supervisorSigned.value = dto.supervisorSigned
  workItems.value = dto.workItems.map((w) => ({
    pccesItemId: w.pccesItemId ?? undefined,
    itemNo: w.itemNo ?? undefined,
    workItemName: w.workItemName,
    unit: w.unit,
    contractQty: w.contractQty,
    dailyCompletedQty: w.dailyCompletedQty,
    accumulatedCompletedQty: w.accumulatedCompletedQty,
    remark: w.remark,
  }))
  inspections.value = dto.inspections.map((i) => ({
    category: i.category,
    description: i.description,
  }))
  materialChecks.value = dto.materialChecks.map((m) => ({
    category: m.category,
    description: m.description,
    referenceNo: m.referenceNo,
  }))
}

onMounted(async () => {
  try {
    if (isNew.value) {
      const today = new Date().toISOString().slice(0, 10)
      reportDate.value = today
      const defaults = await getSupervisionReportDefaults(projectId.value, today)
      projectName.value = defaults.projectName
      startDate.value = defaults.startDate ?? ''
      contractDuration.value = defaults.contractDuration ?? undefined
      plannedCompletionDate.value = defaults.plannedCompletionDate ?? ''
      extensionDays.value = defaults.extensionDays > 0 ? defaults.extensionDays : undefined
      contractChangeCount.value = defaults.contractChangeCount > 0 ? defaults.contractChangeCount : undefined
      if (defaults.constructionPlannedProgress != null) {
        constructionPlannedProgress.value = Number(defaults.constructionPlannedProgress)
      }
    } else {
      const dto = await getSupervisionReport(projectId.value, reportId.value)
      fillFromDto(dto)
    }
  } catch (e: unknown) {
    errorMessage.value = e instanceof Error ? e.message : '載入失敗'
  } finally {
    loading.value = false
  }
})

// ── PCCES picker ──
async function openPccesPicker() {
  if (!reportDate.value) {
    errorMessage.value = '請先選擇填報日期'
    return
  }
  pccesLoading.value = true
  pccesPickerOpen.value = true
  pccesSearch.value = ''
  try {
    const res = await getSupervisionReportPccesWorkItems(projectId.value, {
      reportDate: reportDate.value,
      excludeReportId: isNew.value ? undefined : reportId.value,
    })
    pccesItems.value = res.items
  } catch {
    pccesItems.value = []
  } finally {
    pccesLoading.value = false
  }
}

const filteredPccesItems = computed(() => {
  const q = pccesSearch.value.trim().toLowerCase()
  const leaves = pccesItems.value.filter((r) => r.isStructuralLeaf)
  if (!q) return leaves
  return leaves.filter(
    (r) =>
      r.itemNo.toLowerCase().includes(q) ||
      r.workItemName.toLowerCase().includes(q)
  )
})

const selectedPccesIds = computed(() => new Set(workItems.value.map((w) => w.pccesItemId).filter(Boolean)))

function addPccesItem(item: SupervisionReportPccesPickerRow) {
  if (selectedPccesIds.value.has(item.pccesItemId)) return
  workItems.value.push({
    pccesItemId: item.pccesItemId,
    itemNo: item.itemNo,
    workItemName: item.workItemName,
    unit: item.unit,
    contractQty: item.contractQty,
    dailyCompletedQty: '',
    accumulatedCompletedQty: item.priorAccumulatedQty ?? '0',
    remark: '',
  })
}

function removeWorkItem(idx: number) {
  workItems.value.splice(idx, 1)
}

// ── 查驗/材料 ──
function addInspection() {
  inspections.value.push({ category: 'civil', description: '' })
}
function removeInspection(idx: number) {
  inspections.value.splice(idx, 1)
}
function addMaterialCheck() {
  materialChecks.value.push({ category: 'incoming', description: '', referenceNo: '' })
}
function removeMaterialCheck(idx: number) {
  materialChecks.value.splice(idx, 1)
}

// ── 儲存 ──
async function save() {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const payload: SupervisionReportUpsertPayload = {
      reportNo: reportNo.value || null,
      weatherAm: weatherAm.value || null,
      weatherPm: weatherPm.value || null,
      reportDate: reportDate.value,
      projectName: projectName.value,
      contractDuration: contractDuration.value,
      startDate: startDate.value || null,
      plannedCompletionDate: plannedCompletionDate.value || null,
      actualCompletionDate: actualCompletionDate.value || null,
      contractChangeCount: contractChangeCount.value,
      extensionDays: extensionDays.value,
      originalContractAmount: originalContractAmount.value || null,
      designFee: designFee.value || null,
      contractTotal: contractTotal.value || null,
      constructionPlannedProgress: constructionPlannedProgress.value,
      constructionActualProgress: constructionActualProgress.value,
      overallPlannedProgress: overallPlannedProgress.value,
      overallActualProgress: overallActualProgress.value,
      inspectionNotes: inspectionNotes.value,
      materialQualityNotes: materialQualityNotes.value,
      preWorkCheckCompleted: preWorkCheckCompleted.value,
      safetyNotes: safetyNotes.value,
      otherSupervisionNotes: otherSupervisionNotes.value,
      supervisorSigned: supervisorSigned.value,
      inspections: inspections.value.filter((i) => i.description.trim()),
      materialChecks: materialChecks.value.filter((m) => m.description.trim()),
      workItems: workItems.value.map((w) => ({
        pccesItemId: w.pccesItemId,
        workItemName: w.workItemName,
        unit: w.unit,
        contractQty: w.contractQty,
        dailyCompletedQty: w.dailyCompletedQty || '0',
        accumulatedCompletedQty: w.accumulatedCompletedQty || '0',
        remark: w.remark,
      })),
    }

    if (isNew.value) {
      const created = await createSupervisionReport(projectId.value, payload)
      successMessage.value = '監造報表已建立'
      await router.replace({
        name: ROUTE_NAME.PROJECT_CONSTRUCTION_SUPERVISION_DETAIL,
        params: { projectId: projectId.value, reportId: created.id },
      })
      fillFromDto(created)
    } else {
      const updated = await updateSupervisionReport(projectId.value, reportId.value, payload)
      successMessage.value = '監造報表已更新'
      fillFromDto(updated)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '儲存失敗'
    if (typeof e === 'object' && e !== null && 'response' in e) {
      const resp = (e as { response?: { data?: { message?: string } } }).response
      errorMessage.value = resp?.data?.message ?? msg
    } else {
      errorMessage.value = msg
    }
  } finally {
    saving.value = false
  }
}

async function downloadExcel() {
  if (isNew.value || !reportId.value) return
  try {
    const url = getSupervisionReportExcelUrl(projectId.value, reportId.value)
    const { data } = await apiClient.get(url, { responseType: 'blob' })
    const blob = new Blob([data as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `監造報表_${reportDate.value}.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    errorMessage.value = '匯出失敗'
  }
}

function goBack() {
  router.push({
    name: ROUTE_NAME.PROJECT_CONSTRUCTION_SUPERVISION,
    params: { projectId: projectId.value },
  })
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 pb-12">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" @click="goBack">
        <ArrowLeft class="size-5" />
      </Button>
      <ShieldCheck class="size-5 text-primary" />
      <h1 class="text-xl font-semibold text-foreground">
        {{ isNew ? '新增監造報表' : '編輯監造報表' }}
      </h1>
      <div class="flex-1" />
      <Button
        v-if="!isNew"
        variant="outline"
        size="sm"
        class="gap-2"
        @click="downloadExcel"
      >
        <Download class="size-4" />
        匯出 Excel
      </Button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="size-8 animate-spin text-muted-foreground" />
    </div>

    <template v-else>
      <!-- 訊息 -->
      <p v-if="errorMessage" class="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="rounded-md bg-green-500/10 px-4 py-2 text-sm text-green-600">
        {{ successMessage }}
      </p>

      <!-- 表頭 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 class="text-base font-semibold text-foreground">表頭資訊</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>系統編號</Label>
            <Input v-model="reportNo" placeholder="自動或手填" />
          </div>
          <div>
            <Label>填報日期</Label>
            <Input v-model="reportDate" type="date" />
          </div>
          <div>
            <Label>工程名稱</Label>
            <Input v-model="projectName" />
          </div>
          <div>
            <Label>上午天氣</Label>
            <Input v-model="weatherAm" placeholder="晴、陰、雨…" />
          </div>
          <div>
            <Label>下午天氣</Label>
            <Input v-model="weatherPm" placeholder="晴、陰、雨…" />
          </div>
          <div>
            <Label>契約工期（天）</Label>
            <Input v-model.number="contractDuration" type="number" />
          </div>
          <div>
            <Label>開工日期</Label>
            <Input v-model="startDate" type="date" />
          </div>
          <div>
            <Label>預定完工日期</Label>
            <Input v-model="plannedCompletionDate" type="date" />
          </div>
          <div>
            <Label>實際完工日期</Label>
            <Input v-model="actualCompletionDate" type="date" />
          </div>
          <div>
            <Label>契約變更次數</Label>
            <Input v-model.number="contractChangeCount" type="number" />
          </div>
          <div>
            <Label>工期展延天數</Label>
            <Input v-model.number="extensionDays" type="number" />
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>原契約工程費</Label>
            <Input v-model="originalContractAmount" placeholder="元" />
          </div>
          <div>
            <Label>原契約設計相關費</Label>
            <Input v-model="designFee" placeholder="元" />
          </div>
          <div>
            <Label>契約總價</Label>
            <Input v-model="contractTotal" placeholder="元" />
          </div>
        </div>
      </section>

      <!-- 進度 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 class="text-base font-semibold text-foreground">進度概覽</h2>
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <Label>施工預定進度(%)</Label>
            <Input v-model.number="constructionPlannedProgress" type="number" step="0.01" />
          </div>
          <div>
            <Label>施工實際進度(%)</Label>
            <Input v-model.number="constructionActualProgress" type="number" step="0.01" />
          </div>
          <div>
            <Label>全案預定進度(%)</Label>
            <Input v-model.number="overallPlannedProgress" type="number" step="0.01" />
          </div>
          <div>
            <Label>全案實際進度(%)</Label>
            <Input v-model.number="overallActualProgress" type="number" step="0.01" />
          </div>
        </div>
      </section>

      <!-- 一、工程進行情況 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">一、工程進行情況</h2>
          <Button size="sm" variant="outline" class="gap-2" @click="openPccesPicker">
            <Plus class="size-4" />
            從契約工項選取
          </Button>
        </div>
        <p class="text-sm text-muted-foreground">
          從契約項目中選擇當日施工項目，填寫本日完成數量。選入的項目會同時出現在匯出 Excel 的「完成工程詳細表」中。
        </p>
        <div v-if="workItems.length === 0" class="py-4 text-center text-sm text-muted-foreground">
          尚未加入施工項目
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="(w, idx) in workItems"
            :key="idx"
            class="flex flex-col gap-2 rounded-md border border-border/60 bg-muted/30 p-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-foreground">
                  <span v-if="w.itemNo" class="mr-2 text-xs text-muted-foreground">{{ w.itemNo }}</span>
                  {{ w.workItemName }}
                </p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  單位：{{ w.unit }} ｜ 契約數量：{{ w.contractQty }}
                </p>
              </div>
              <Button variant="ghost" size="icon" class="shrink-0" @click="removeWorkItem(idx)">
                <Trash2 class="size-4 text-destructive" />
              </Button>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <Label class="text-xs">本日完成數量</Label>
                <Input v-model="w.dailyCompletedQty" placeholder="0" />
              </div>
              <div>
                <Label class="text-xs">累計完成數量</Label>
                <Input v-model="w.accumulatedCompletedQty" disabled class="bg-muted" />
              </div>
              <div>
                <Label class="text-xs">備註</Label>
                <Input v-model="w.remark" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 二、施工查驗 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">二、監督施工查驗</h2>
          <Button size="sm" variant="outline" class="gap-2" @click="addInspection">
            <Plus class="size-4" />
            新增查驗項目
          </Button>
        </div>
        <div v-if="inspections.length === 0" class="py-2 text-sm text-muted-foreground">
          尚未加入查驗項目
        </div>
        <div v-for="(insp, idx) in inspections" :key="idx" class="flex items-start gap-2">
          <Select v-model="insp.category">
            <SelectTrigger class="w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="cat in INSPECTION_CATEGORIES"
                :key="cat.value"
                :value="cat.value"
              >
                {{ cat.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="insp.description" placeholder="查驗內容" class="flex-1" />
          <Button variant="ghost" size="icon" @click="removeInspection(idx)">
            <Trash2 class="size-4 text-destructive" />
          </Button>
        </div>
        <div>
          <Label>查驗備註</Label>
          <textarea v-model="inspectionNotes" rows="2" placeholder="其他查驗說明（選填）" class="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50" />
        </div>
      </section>

      <!-- 三、材料查核 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-foreground">三、材料規格品質查核</h2>
          <Button size="sm" variant="outline" class="gap-2" @click="addMaterialCheck">
            <Plus class="size-4" />
            新增材料查核
          </Button>
        </div>
        <div v-if="materialChecks.length === 0" class="py-2 text-sm text-muted-foreground">
          尚未加入材料查核項目
        </div>
        <div v-for="(mat, idx) in materialChecks" :key="idx" class="flex items-start gap-2">
          <Select v-model="mat.category">
            <SelectTrigger class="w-44 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="cat in MATERIAL_CATEGORIES"
                :key="cat.value"
                :value="cat.value"
              >
                {{ cat.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="mat.description" placeholder="材料名稱與查核內容" class="flex-1" />
          <Input v-model="mat.referenceNo" placeholder="編號" class="w-32 shrink-0" />
          <Button variant="ghost" size="icon" @click="removeMaterialCheck(idx)">
            <Trash2 class="size-4 text-destructive" />
          </Button>
        </div>
        <div>
          <Label>材料查核備註</Label>
          <textarea v-model="materialQualityNotes" rows="2" placeholder="其他材料查核說明（選填）" class="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50" />
        </div>
      </section>

      <!-- 四、職安衛生 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 class="text-base font-semibold text-foreground">四、職業安全衛生督導</h2>
        <div class="flex items-center gap-3">
          <Checkbox
            :checked="preWorkCheckCompleted"
            @update:checked="(v: boolean | 'indeterminate') => (preWorkCheckCompleted = !!v)"
          />
          <Label>施工廠商施工前檢查事項辦理情形：已完成</Label>
        </div>
        <div>
          <Label>其他工地安全衛生督導事項</Label>
          <textarea v-model="safetyNotes" rows="3" placeholder="安全督導相關記錄" class="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50" />
        </div>
      </section>

      <!-- 五、其他 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 class="text-base font-semibold text-foreground">五、其他約定監造事項</h2>
        <textarea
          v-model="otherSupervisionNotes"
          rows="4"
          placeholder="重要事項紀錄、主辦機關指示、通知廠商辦理事項等"
          class="border-input bg-transparent placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
        />
      </section>

      <!-- 簽章 -->
      <section class="space-y-4 rounded-lg border border-border bg-card p-5">
        <div class="flex items-center gap-3">
          <Checkbox
            :checked="supervisorSigned"
            @update:checked="(v: boolean | 'indeterminate') => (supervisorSigned = !!v)"
          />
          <Label class="text-base font-semibold">監造單位簽章確認</Label>
        </div>
      </section>

      <!-- 操作 -->
      <div class="flex items-center justify-end gap-3">
        <Button variant="outline" @click="goBack">取消</Button>
        <Button :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="mr-2 size-4 animate-spin" />
          {{ saving ? '儲存中…' : '儲存' }}
        </Button>
      </div>
    </template>

    <!-- PCCES picker dialog -->
    <Dialog v-model:open="pccesPickerOpen">
      <DialogContent class="flex max-h-[80vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader class="shrink-0 border-b px-6 py-4">
          <DialogTitle>選擇契約工項</DialogTitle>
          <DialogDescription>
            選擇當日施工的契約項目。已選取的項目會標記為灰色。
          </DialogDescription>
        </DialogHeader>
        <div class="shrink-0 border-b px-6 py-3">
          <Input v-model="pccesSearch" placeholder="搜尋項次或工程項目…" />
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-2">
          <div v-if="pccesLoading" class="flex items-center justify-center py-8">
            <Loader2 class="size-6 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="filteredPccesItems.length === 0" class="py-8 text-center text-sm text-muted-foreground">
            {{ pccesItems.length === 0 ? '專案尚無核定之契約工項' : '沒有符合搜尋條件的項目' }}
          </div>
          <div v-else class="space-y-1">
            <button
              v-for="item in filteredPccesItems"
              :key="item.pccesItemId"
              class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
              :class="{ 'opacity-40': selectedPccesIds.has(item.pccesItemId) }"
              :disabled="selectedPccesIds.has(item.pccesItemId)"
              @click="addPccesItem(item)"
            >
              <span class="w-36 shrink-0 font-mono text-xs text-muted-foreground">{{ item.itemNo }}</span>
              <span class="min-w-0 flex-1 truncate">{{ item.workItemName }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ item.unit }}</span>
              <span class="w-20 shrink-0 text-right tabular-nums text-xs">{{ item.contractQty }}</span>
            </button>
          </div>
        </div>
        <DialogFooter class="shrink-0 border-t px-6 py-3">
          <Button variant="outline" @click="pccesPickerOpen = false">關閉</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
