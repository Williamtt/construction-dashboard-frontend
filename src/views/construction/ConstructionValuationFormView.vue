<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn, randomRowKey } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buildProjectPath, ROUTE_PATH, ROUTE_NAME } from '@/constants/routes'
import { parseLocaleNumber, formatThousands } from '@/lib/format-number'
import {
  createConstructionValuation,
  deleteConstructionValuation,
  getConstructionValuation,
  getConstructionValuationPccesLines,
  updateConstructionValuation,
  type ConstructionValuationDto,
} from '@/api/construction-valuations'
import { useProjectModuleActions } from '@/composables/useProjectModuleActions'
import { toast } from '@/components/ui/sonner'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-vue-next'

type LineDraft = {
  rowKey: string
  pccesItemId?: string
  pccesParentItemKey?: number | null
  itemNo: string
  description: string
  unit: string
  contractQty: string
  approvedQtyAfterChange: string
  unitPrice: string
  currentPeriodQty: string
  remark: string
  priorBilledQty: string
  maxQty: string
}

type GroupSection = {
  parent: { itemNo: string; description: string; unit: string } | null
  lineIds: string[]
}

function lineCapN(line: LineDraft): number {
  if (line.pccesItemId) {
    return parseLocaleNumber(line.maxQty) ?? 0
  }
  const a = line.approvedQtyAfterChange.trim()
    ? parseLocaleNumber(line.approvedQtyAfterChange)
    : null
  const c = parseLocaleNumber(line.contractQty) ?? 0
  if (a != null) return a
  return c
}

function maxCurrentN(line: LineDraft): number {
  const cap = lineCapN(line)
  const prior = parseLocaleNumber(line.priorBilledQty) ?? 0
  return Math.max(0, cap - prior)
}

function currentQtyN(line: LineDraft): number {
  return parseLocaleNumber(line.currentPeriodQty) ?? 0
}

function availableN(line: LineDraft): number {
  return Math.max(0, maxCurrentN(line) - currentQtyN(line))
}

function cumulativeQtyN(line: LineDraft): number {
  const prior = parseLocaleNumber(line.priorBilledQty) ?? 0
  return prior + currentQtyN(line)
}

function unitPriceN(line: LineDraft): number {
  return parseLocaleNumber(line.unitPrice) ?? 0
}

function lineCurrentAmountN(line: LineDraft): number {
  return currentQtyN(line) * unitPriceN(line)
}

function lineCumulativeAmountN(line: LineDraft): number {
  return cumulativeQtyN(line) * unitPriceN(line)
}

function getLine(rowKey: string): LineDraft | undefined {
  return lines.value.find((l) => l.rowKey === rowKey)
}

function sectionAmounts67(section: GroupSection): { a6: number; a7: number } {
  let a6 = 0
  let a7 = 0
  for (const id of section.lineIds) {
    const line = getLine(id)
    if (!line) continue
    a6 += lineCurrentAmountN(line)
    a7 += lineCumulativeAmountN(line)
  }
  return { a6, a7 }
}

function sectionLines(section: GroupSection): LineDraft[] {
  return section.lineIds.map((id) => getLine(id)).filter((l): l is LineDraft => Boolean(l))
}

const displaySections = computed(() => {
  if (lines.value.length === 0) return []
  if (groupSections.value.length === 0) {
    return [{ parent: null as null, lineIds: lines.value.map((l) => l.rowKey) }]
  }
  return groupSections.value
})

type ValuationTableRow =
  | { kind: 'empty'; key: 'empty' }
  | { kind: 'parent'; key: string; section: GroupSection }
  | { kind: 'line'; key: string; line: LineDraft }

/** 扁平列：避免 tbody 內巢狀 template 在 HMR 時觸發編譯錯誤 */
const valuationTableRows = computed((): ValuationTableRow[] => {
  if (lines.value.length === 0) return [{ kind: 'empty', key: 'empty' }]
  const out: ValuationTableRow[] = []
  let parentSeq = 0
  for (const section of displaySections.value) {
    if (section.parent) {
      out.push({
        kind: 'parent',
        key: `p-${parentSeq++}-${section.lineIds[0] ?? 'x'}`,
        section,
      })
    }
    for (const line of sectionLines(section)) {
      out.push({ kind: 'line', key: line.rowKey, line })
    }
  }
  return out
})

const route = useRoute()
const router = useRouter()
const projectId = computed(() => (route.params.projectId as string) ?? '')
const valuationId = computed(() => (route.params.valuationId as string) ?? '')
const isNew = computed(() => route.name === ROUTE_NAME.PROJECT_CONSTRUCTION_DIARY_VALUATION_NEW)
const perm = useProjectModuleActions(projectId, 'construction.valuation')

const listPath = computed(() =>
  buildProjectPath(projectId.value, ROUTE_PATH.PROJECT_CONSTRUCTION_DIARY_VALUATIONS)
)

const loading = ref(true)
const saving = ref(false)
const pickerLoading = ref(false)
const deleteOpen = ref(false)
const deleteLoading = ref(false)

const title = ref('')
const valuationDate = ref('')
const headerRemark = ref('')
const lines = ref<LineDraft[]>([])
const groupSections = ref<GroupSection[]>([])

function draftFromDto(d: ConstructionValuationDto): void {
  title.value = d.title ?? ''
  valuationDate.value = d.valuationDate ?? ''
  headerRemark.value = d.headerRemark ?? ''
  lines.value = d.lines.map((l) => ({
    rowKey: l.id,
    pccesItemId: l.pccesItemId ?? undefined,
    pccesParentItemKey: l.pccesParentItemKey ?? undefined,
    itemNo: l.itemNo,
    description: l.description,
    unit: l.unit,
    contractQty: l.contractQty,
    approvedQtyAfterChange: l.approvedQtyAfterChange ?? '',
    unitPrice: l.unitPrice,
    currentPeriodQty: l.currentPeriodQty,
    remark: l.remark,
    priorBilledQty: l.priorBilledQty,
    maxQty: l.maxQty,
  }))
  const groups = d.lineGroups
  if (groups != null && groups.length > 0) {
    groupSections.value = groups.map((g) => ({
      parent: g.parent
        ? {
            itemNo: g.parent.itemNo,
            description: g.parent.description,
            unit: g.parent.unit,
          }
        : null,
      lineIds: d.lines.slice(g.lineStartIndex, g.lineStartIndex + g.lineCount).map((x) => x.id),
    }))
  } else {
    groupSections.value =
      lines.value.length > 0 ? [{ parent: null, lineIds: lines.value.map((l) => l.rowKey) }] : []
  }
}

async function load() {
  loading.value = true
  try {
    if (isNew.value) {
      title.value = ''
      valuationDate.value = ''
      headerRemark.value = ''
      lines.value = []
      groupSections.value = []
    } else {
      const d = await getConstructionValuation(projectId.value, valuationId.value)
      draftFromDto(d)
    }
  } catch (e) {
    console.error('[ConstructionValuationForm] load', e)
    toast.error('載入失敗', { description: getApiErrorMessage(e) })
    lines.value = []
    groupSections.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [route.name, route.params.valuationId, route.params.projectId] as const,
  () => {
    void load()
  },
  { immediate: true }
)

async function fillFromPcces() {
  if (lines.value.length > 0) {
    if (!window.confirm('將以 PCCES 明細取代目前表格列，是否繼續？')) return
  }
  pickerLoading.value = true
  try {
    const data = await getConstructionValuationPccesLines(projectId.value, {
      excludeValuationId: isNew.value ? undefined : valuationId.value,
    })
    if (!data.items.length) {
      toast.message('無可用工項', { description: '請先完成 PCCES 匯入並核定版本。' })
      return
    }
    const groupsToUse =
      data.groups.length > 0 ? data.groups : [{ parent: null, children: data.items }]
    const nextLines: LineDraft[] = []
    const nextSecs: GroupSection[] = []
    for (const g of groupsToUse) {
      const ids: string[] = []
      for (const c of g.children) {
        const rk = randomRowKey()
        ids.push(rk)
        nextLines.push({
          rowKey: rk,
          pccesItemId: c.pccesItemId,
          pccesParentItemKey: g.parent?.itemKey ?? undefined,
          itemNo: c.itemNo,
          description: c.description,
          unit: c.unit,
          contractQty: c.contractQty,
          approvedQtyAfterChange: c.approvedQtyAfterChange ?? '',
          unitPrice: c.unitPrice,
          currentPeriodQty: '0',
          remark: '',
          priorBilledQty: c.priorBilledQty,
          maxQty: c.maxQty,
        })
      }
      nextSecs.push({
        parent: g.parent
          ? {
              itemNo: g.parent.itemNo,
              description: g.parent.description,
              unit: g.parent.unit,
            }
          : null,
        lineIds: ids,
      })
    }
    lines.value = nextLines
    groupSections.value = nextSecs
  } catch (e) {
    console.error('[ConstructionValuationForm] fillFromPcces', e)
    toast.error('載入 PCCES 明細失敗', { description: getApiErrorMessage(e) })
  } finally {
    pickerLoading.value = false
  }
}

function addManualRow() {
  const rk = randomRowKey()
  lines.value.push({
    rowKey: rk,
    itemNo: '',
    description: '',
    unit: '',
    contractQty: '0',
    approvedQtyAfterChange: '',
    unitPrice: '0',
    currentPeriodQty: '0',
    remark: '',
    priorBilledQty: '0',
    maxQty: '0',
  })
  const last = groupSections.value[groupSections.value.length - 1]
  if (last && last.parent === null) {
    last.lineIds.push(rk)
  } else {
    groupSections.value.push({ parent: null, lineIds: [rk] })
  }
}

function isPccesBoundLine(line: LineDraft): boolean {
  return Boolean(line.pccesItemId)
}

function removeLine(rowKey: string) {
  const target = getLine(rowKey)
  if (target && isPccesBoundLine(target)) {
    toast.message('無法刪除此列', {
      description: '自 PCCES 帶入的工項不可刪除；可新增手填列補充說明。',
    })
    return
  }
  if (lines.value.length <= 1) {
    toast.message('至少保留一列', { description: '若不需估驗請刪除整張估驗單。' })
    return
  }
  const i = lines.value.findIndex((l) => l.rowKey === rowKey)
  if (i < 0) return
  lines.value.splice(i, 1)
  for (const sec of groupSections.value) {
    sec.lineIds = sec.lineIds.filter((id) => id !== rowKey)
  }
  groupSections.value = groupSections.value.filter((sec) => sec.lineIds.length > 0)
}

function clampCurrent(rowKey: string) {
  const line = getLine(rowKey)
  if (!line) return
  let n = parseLocaleNumber(line.currentPeriodQty) ?? 0
  const maxC = maxCurrentN(line)
  if (n > maxC) n = maxC
  if (n < 0) n = 0
  line.currentPeriodQty = String(n)
}

function buildPayload() {
  const ordered: LineDraft[] = []
  const seen = new Set<string>()
  for (const sec of groupSections.value) {
    for (const id of sec.lineIds) {
      const l = getLine(id)
      if (l) {
        ordered.push(l)
        seen.add(id)
      }
    }
  }
  for (const l of lines.value) {
    if (!seen.has(l.rowKey)) ordered.push(l)
  }
  return {
    title: title.value.trim() || null,
    valuationDate: valuationDate.value.trim() || null,
    headerRemark: headerRemark.value,
    lines: ordered.map((l) => ({
      ...(l.pccesItemId ? { pccesItemId: l.pccesItemId } : {}),
      itemNo: l.itemNo,
      description: l.description,
      unit: l.unit,
      contractQty: l.contractQty,
      approvedQtyAfterChange: l.approvedQtyAfterChange.trim()
        ? l.approvedQtyAfterChange.trim()
        : null,
      unitPrice: l.unitPrice,
      currentPeriodQty: l.currentPeriodQty,
      remark: l.remark,
    })),
  }
}

const canEdit = computed(() => (isNew.value ? perm.canCreate.value : perm.canUpdate.value))

async function save() {
  if (!canEdit.value) return
  if (lines.value.length === 0) {
    toast.error('請至少新增一列明細')
    return
  }
  for (const l of lines.value) {
    if (!isPccesBoundLine(l) && !l.description.trim()) {
      toast.error('請填寫項目說明')
      return
    }
  }
  saving.value = true
  try {
    const payload = buildPayload()
    if (isNew.value) {
      const d = await createConstructionValuation(projectId.value, payload)
      toast.success('已建立')
      await router.replace({
        name: ROUTE_NAME.PROJECT_CONSTRUCTION_DIARY_VALUATION_DETAIL,
        params: { projectId: projectId.value, valuationId: d.id },
      })
    } else {
      await updateConstructionValuation(projectId.value, valuationId.value, payload)
      toast.success('已儲存')
      await load()
    }
  } catch (e) {
    console.error('[ConstructionValuationForm] save', e)
    toast.error('儲存失敗', { description: getApiErrorMessage(e) })
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!perm.canDelete.value) return
  deleteLoading.value = true
  try {
    await deleteConstructionValuation(projectId.value, valuationId.value)
    toast.success('已刪除')
    deleteOpen.value = false
    await router.push(listPath.value)
  } catch (e) {
    console.error('[ConstructionValuationForm] confirmDelete', e)
    toast.error('刪除失敗', { description: getApiErrorMessage(e) })
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" as-child class="text-muted-foreground">
        <RouterLink :to="listPath" class="inline-flex items-center gap-1">
          <ArrowLeft class="size-4" />
          估驗列表
        </RouterLink>
      </Button>
      <Button
        v-if="!isNew && perm.canDelete.value"
        variant="outline"
        size="sm"
        class="ms-auto text-destructive hover:text-destructive"
        type="button"
        @click="deleteOpen = true"
      >
        <Trash2 class="size-4" />
        刪除此估驗
      </Button>
    </div>

    <div>
      <h1 class="text-xl font-semibold text-foreground">
        {{ isNew ? '新增估驗計價' : '估驗計價明細' }}
      </h1>
      <p class="mt-1 text-sm text-muted-foreground">
        本次估驗數量手填；本次可估驗數量會隨輸入即時減少，達上限後無法再增加。
      </p>
    </div>

    <div v-if="!perm.canRead.value" class="text-sm text-muted-foreground">
      您沒有估驗計價檢視權限（<code class="rounded bg-muted px-1 py-0.5 text-xs"
        >construction.valuation</code
      >）。
    </div>

    <template v-else-if="loading">
      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 class="size-4 animate-spin" />
        載入中…
      </div>
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <Label for="val-title">標題（選填）</Label>
          <Input
            id="val-title"
            v-model="title"
            class="bg-background"
            :disabled="!canEdit"
            placeholder="例如：第 3 期估驗"
          />
        </div>
        <div class="space-y-2">
          <Label for="val-date">估驗日期（選填）</Label>
          <Input
            id="val-date"
            v-model="valuationDate"
            type="date"
            class="bg-background"
            :disabled="!canEdit"
          />
        </div>
        <div class="space-y-2 sm:col-span-2">
          <Label for="val-hdr">表頭備註</Label>
          <textarea
            id="val-hdr"
            v-model="headerRemark"
            rows="2"
            :disabled="!canEdit"
            :class="
              cn(
                'placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              )
            "
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Button
          v-if="canEdit"
          type="button"
          variant="outline"
          size="sm"
          :disabled="pickerLoading"
          @click="fillFromPcces"
        >
          <Loader2 v-if="pickerLoading" class="size-4 animate-spin" />
          <template v-else>自 PCCES 帶入明細</template>
        </Button>
        <Button v-if="canEdit" type="button" variant="outline" size="sm" @click="addManualRow">
          <Plus class="size-4" />
          新增手填列
        </Button>
      </div>

      <div class="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead class="min-w-[3rem] whitespace-normal text-center"> 項次 </TableHead>
              <TableHead class="min-w-[10rem] whitespace-normal"> 項目說明 </TableHead>
              <TableHead class="min-w-[3rem] whitespace-normal"> 單位 </TableHead>
              <TableHead class="min-w-[5rem] whitespace-normal text-end">
                （一）契約數量
              </TableHead>
              <TableHead class="min-w-[5rem] whitespace-normal text-end">
                變更後核定數量
              </TableHead>
              <TableHead class="min-w-[5rem] whitespace-normal text-end"> （三）單價 </TableHead>
              <TableHead class="min-w-[6rem] whitespace-normal text-end">
                （四）本次估驗數量
              </TableHead>
              <TableHead class="min-w-[6rem] whitespace-normal text-end">
                本次可估驗數量
              </TableHead>
              <TableHead class="min-w-[6rem] whitespace-normal text-end">
                （五）本次止累計估驗數量
              </TableHead>
              <TableHead class="min-w-[6rem] whitespace-normal text-end">
                （六）本次估驗金額
              </TableHead>
              <TableHead class="min-w-[6rem] whitespace-normal text-end">
                （七）本次止累計估驗金額
              </TableHead>
              <TableHead class="min-w-[6rem] whitespace-normal"> 備註 </TableHead>
              <TableHead v-if="canEdit" class="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-for="row in valuationTableRows" :key="row.key">
              <TableRow v-if="row.kind === 'empty'">
                <TableCell
                  :colspan="canEdit ? 13 : 12"
                  class="py-8 text-center text-muted-foreground"
                >
                  尚無明細，請「自 PCCES 帶入明細」或新增手填列。
                </TableCell>
              </TableRow>
              <TableRow v-else-if="row.kind === 'parent'" class="bg-muted/40 hover:bg-muted/50">
                <TableCell class="text-center text-sm font-medium text-foreground">
                  {{ row.section.parent!.itemNo?.trim() || '—' }}
                </TableCell>
                <TableCell
                  class="max-w-md min-w-[10rem] whitespace-normal break-words text-sm text-foreground"
                >
                  {{ row.section.parent!.description }}
                </TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ row.section.parent!.unit }}
                </TableCell>
                <TableCell class="text-end text-muted-foreground">—</TableCell>
                <TableCell class="text-end text-muted-foreground">—</TableCell>
                <TableCell class="text-end text-muted-foreground">—</TableCell>
                <TableCell class="text-end text-muted-foreground">—</TableCell>
                <TableCell class="text-end text-muted-foreground">—</TableCell>
                <TableCell class="text-end text-muted-foreground">—</TableCell>
                <TableCell class="text-end tabular-nums font-medium text-foreground">
                  {{
                    formatThousands(sectionAmounts67(row.section).a6, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </TableCell>
                <TableCell class="text-end tabular-nums font-medium text-muted-foreground">
                  {{
                    formatThousands(sectionAmounts67(row.section).a7, {
                      maximumFractionDigits: 2,
                    })
                  }}
                </TableCell>
                <TableCell />
                <TableCell v-if="canEdit" />
              </TableRow>
              <TableRow v-else>
                <TableCell class="text-center text-sm text-muted-foreground">
                  {{ row.line.itemNo?.trim() || '—' }}
                </TableCell>
                <!-- PCCES 列：項目說明／單位／數量與單價／備註以純文字呈現（非 disabled Input） -->
                <TableCell
                  class="max-w-md min-w-[10rem] whitespace-normal break-words"
                >
                  <template v-if="isPccesBoundLine(row.line) || !canEdit">
                    <span class="block text-sm text-foreground">{{ row.line.description.trim() || '—' }}</span>
                  </template>
                  <Input v-else v-model="row.line.description" class="bg-background" />
                </TableCell>
                <TableCell>
                  <template v-if="isPccesBoundLine(row.line) || !canEdit">
                    <span class="text-sm text-muted-foreground">{{ row.line.unit.trim() || '—' }}</span>
                  </template>
                  <Input v-else v-model="row.line.unit" class="min-w-[3rem] bg-background" />
                </TableCell>
                <TableCell class="text-end">
                  <template v-if="isPccesBoundLine(row.line) || !canEdit">
                    <span class="tabular-nums text-sm text-foreground">
                      {{ formatThousands(parseLocaleNumber(row.line.contractQty) ?? 0, { maximumFractionDigits: 4 }) }}
                    </span>
                  </template>
                  <Input
                    v-else
                    v-model="row.line.contractQty"
                    class="bg-background text-end tabular-nums"
                    @blur="clampCurrent(row.line.rowKey)"
                  />
                </TableCell>
                <TableCell class="text-end">
                  <template v-if="isPccesBoundLine(row.line) || !canEdit">
                    <span class="tabular-nums text-sm text-muted-foreground">
                      {{
                        row.line.approvedQtyAfterChange.trim()
                          ? formatThousands(parseLocaleNumber(row.line.approvedQtyAfterChange) ?? 0, {
                              maximumFractionDigits: 4,
                            })
                          : '—'
                      }}
                    </span>
                  </template>
                  <Input
                    v-else
                    v-model="row.line.approvedQtyAfterChange"
                    class="bg-background text-end tabular-nums"
                    placeholder="—"
                    @blur="clampCurrent(row.line.rowKey)"
                  />
                </TableCell>
                <TableCell class="text-end">
                  <template v-if="isPccesBoundLine(row.line) || !canEdit">
                    <span class="tabular-nums text-sm text-foreground">
                      {{ formatThousands(unitPriceN(row.line), { maximumFractionDigits: 2 }) }}
                    </span>
                  </template>
                  <Input
                    v-else
                    v-model="row.line.unitPrice"
                    class="bg-background text-end tabular-nums"
                    @blur="clampCurrent(row.line.rowKey)"
                  />
                </TableCell>
                <TableCell class="text-end">
                  <Input
                    v-model="row.line.currentPeriodQty"
                    class="bg-background text-end tabular-nums"
                    :disabled="!canEdit"
                    @blur="clampCurrent(row.line.rowKey)"
                  />
                </TableCell>
                <TableCell class="text-end tabular-nums text-muted-foreground">
                  {{ formatThousands(availableN(row.line), { maximumFractionDigits: 4 }) }}
                </TableCell>
                <TableCell class="text-end tabular-nums text-foreground">
                  {{ formatThousands(cumulativeQtyN(row.line), { maximumFractionDigits: 4 }) }}
                </TableCell>
                <TableCell class="text-end tabular-nums text-foreground">
                  {{
                    formatThousands(lineCurrentAmountN(row.line), {
                      maximumFractionDigits: 2,
                    })
                  }}
                </TableCell>
                <TableCell class="text-end tabular-nums text-muted-foreground">
                  {{
                    formatThousands(lineCumulativeAmountN(row.line), {
                      maximumFractionDigits: 2,
                    })
                  }}
                </TableCell>
                <!-- 備註：日後可併顯 PCCES 變更版次等（後端／匯入流程另議） -->
                <TableCell
                  class="max-w-xs min-w-[6rem] whitespace-normal break-words"
                >
                  <template v-if="isPccesBoundLine(row.line) || !canEdit">
                    <span class="block text-sm text-muted-foreground">{{
                      row.line.remark.trim() || '—'
                    }}</span>
                  </template>
                  <Input v-else v-model="row.line.remark" class="w-full min-w-0 bg-background" />
                </TableCell>
                <TableCell v-if="canEdit">
                  <Button
                    v-if="!isPccesBoundLine(row.line)"
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="text-muted-foreground"
                    @click="removeLine(row.line.rowKey)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>
      </div>

      <div v-if="canEdit" class="flex justify-end gap-2">
        <Button type="button" :disabled="saving" @click="save">
          <Loader2 v-if="saving" class="size-4 animate-spin" />
          <template v-else>儲存</template>
        </Button>
      </div>
    </template>

    <AlertDialog :open="deleteOpen" @update:open="(v: boolean) => !v && (deleteOpen = false)">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除此估驗？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作將軟刪除本筆估驗主檔與明細，且無法從此頁復原。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteLoading">取消</AlertDialogCancel>
          <Button variant="destructive" :disabled="deleteLoading" @click="confirmDelete">
            <Loader2 v-if="deleteLoading" class="mr-2 size-4 animate-spin" />
            刪除
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
