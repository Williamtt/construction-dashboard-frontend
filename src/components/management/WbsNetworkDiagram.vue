<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { VueFlow, ConnectionMode } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import dagre from 'dagre'
import type { Node, Edge, Connection, EdgeChange } from '@vue-flow/core'
import type { WbsNode } from '@/types/wbs'
import WorkPackageNode from '@/components/management/WorkPackageNode.vue'
import type { WorkPackageData } from '@/components/management/WorkPackageNode.vue'

/** 與 Node<WorkPackageData> 結構相容的節點型別，避免 Vue Flow 泛型過深觸發 TS2589 */
type FlowNodeItem = {
  id: string
  position: { x: number; y: number }
  type: string
  data: WorkPackageData
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 100
const STORAGE_KEY_POSITIONS = 'wbs-network-positions'
const props = withDefaults(
  defineProps<{
    wbsTree: WbsNode[]
    workPackageIds: string[]
    taskDependencies: Record<string, string[]>
    /** 專案 id，有值時會依此儲存／還原工作包節點位置 */
    projectId?: string
  }>(),
  { projectId: '' }
)
/** 從 localStorage 讀取已儲存的節點位置 */
function loadSavedPositions(): Record<string, { x: number; y: number }> {
  if (!props.projectId) return {}
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_POSITIONS}-${props.projectId}`)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // ignore
  }
  return {}
}
/** 將目前節點位置寫入 localStorage */
function savePositionsToStorage() {
  if (!props.projectId) return
  try {
    const pos: Record<string, { x: number; y: number }> = {}
    flowNodes.value.forEach((n) => {
      pos[n.id] = { x: n.position.x, y: n.position.y }
    })
    localStorage.setItem(`${STORAGE_KEY_POSITIONS}-${props.projectId}`, JSON.stringify(pos))
  } catch {
    // ignore
  }
}
function collectAllNodes(nodes: WbsNode[]): WbsNode[] {
  const out: WbsNode[] = []
  for (const n of nodes) {
    out.push(n)
    if (n.children?.length) out.push(...collectAllNodes(n.children))
  }
  return out
}
const nodeMap = computed(() => {
  const all = collectAllNodes(props.wbsTree)
  return new Map(all.map((n) => [n.id, n]))
})
const MS_PER_DAY = 24 * 60 * 60 * 1000
function parseDate(d: string): number {
  return new Date(d).setHours(0, 0, 0, 0)
}
export type ScheduleEntry = {
  es: number
  ef: number
  ls: number
  lf: number
  slack: number
  isCritical: boolean
}
/** 要徑與浮時（僅針對工作包），即時依 workPackageIds / taskDependencies / wbsTree 重算 */
function computeSchedule(): Map<string, ScheduleEntry> {
  const ids = props.workPackageIds
  const deps = props.taskDependencies
  const nodes = ids.map((id) => nodeMap.value.get(id)).filter(Boolean) as WbsNode[]
  if (nodes.length === 0) return new Map()
  const getDuration = (n: WbsNode) => Math.max(1, n.durationDays ?? 0)
  const projectStart = Math.min(
    ...nodes.map((n) => (n.startDate ? parseDate(n.startDate) : 0))
  ) || Date.now()
  const toDay = (ms: number) => Math.round((ms - projectStart) / MS_PER_DAY)
  const schedule = new Map<string, ScheduleEntry>()
  const sorted: WbsNode[] = []
  const visited = new Set<string>()
  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    for (const predId of deps[id] ?? []) {
      if (ids.includes(predId)) visit(predId)
    }
    const n = nodeMap.value.get(id)
    if (n) sorted.push(n)
  }
  nodes.forEach((n) => visit(n.id))
  for (const n of sorted) {
    const preds = (deps[n.id] ?? []).filter((id) => ids.includes(id))
    const es =
      preds.length > 0
        ? Math.max(0, ...preds.map((id) => schedule.get(id)?.ef ?? 0))
        : Math.max(0, n.startDate ? toDay(parseDate(n.startDate)) : 0)
    const dur = getDuration(n)
    const ef = es + dur
    schedule.set(n.id, { es, ef, ls: 0, lf: 0, slack: 0, isCritical: false })
  }
  const projectEnd = Math.max(
    0,
    ...Array.from(schedule.values()).map((s) => s.ef)
  )
  for (let i = sorted.length - 1; i >= 0; i--) {
    const n = sorted[i]
    const s = schedule.get(n.id)!
    const successors = nodes.filter((x) => (deps[x.id] ?? []).includes(n.id))
    const lf =
      successors.length > 0
        ? Math.min(
            ...successors.map((x) => schedule.get(x.id)?.ls ?? projectEnd)
          )
        : projectEnd
    const dur = getDuration(n)
    const ls = lf - dur
    s.lf = lf
    s.ls = ls
    s.slack = s.ls - s.es
    s.isCritical = s.slack <= 0
  }
  return schedule
}
const scheduleMap = computed(() => computeSchedule())
const flowNodes = ref<FlowNodeItem[]>([])
const flowEdges = ref<Edge[]>([])
const flowNodesForFlow = computed(() => flowNodes.value as Node<WorkPackageData>[])
const flowEdgesForFlow = computed(() => flowEdges.value)
/** 網格備援版面（dagre 在含環或部分圖形會拋錯） */
function gridPositionsForNodes(nodeList: WbsNode[]): Record<string, { x: number; y: number }> {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodeList.length)))
  const out: Record<string, { x: number; y: number }> = {}
  nodeList.forEach((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    out[n.id] = {
      x: col * (NODE_WIDTH + 100),
      y: row * (NODE_HEIGHT + 80),
    }
  })
  return out
}

function buildGraph() {
  const ids = props.workPackageIds
  const nodes = ids
    .map((id) => nodeMap.value.get(id))
    .filter(Boolean) as WbsNode[]
  if (nodes.length === 0) {
    flowNodes.value = []
    flowEdges.value = []
    return
  }
  const savedPos = loadSavedPositions()
  const schedule = scheduleMap.value

  type EdgePair = { v: string; w: string }
  const edgePairs: EdgePair[] = []
  const edgeKey = new Set<string>()
  for (const n of nodes) {
    for (const predId of props.taskDependencies[n.id] ?? []) {
      if (!ids.includes(predId)) continue
      const k = `${predId}->${n.id}`
      if (edgeKey.has(k)) continue
      edgeKey.add(k)
      edgePairs.push({ v: predId, w: n.id })
    }
  }

  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', ranksep: 48, nodesep: 32 })
  nodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edgePairs.forEach((e) => g.setEdge(e.v, e.w))

  let posById: Record<string, { x: number; y: number }> = {}
  try {
    dagre.layout(g)
    let layoutOk = true
    for (const n of nodes) {
      const meta = g.node(n.id)
      if (
        !meta ||
        typeof meta.x !== 'number' ||
        Number.isNaN(meta.x) ||
        typeof meta.y !== 'number' ||
        Number.isNaN(meta.y)
      ) {
        layoutOk = false
        break
      }
      posById[n.id] = {
        x: meta.x - NODE_WIDTH / 2,
        y: meta.y - NODE_HEIGHT / 2,
      }
    }
    if (!layoutOk) posById = gridPositionsForNodes(nodes)
  } catch {
    posById = gridPositionsForNodes(nodes)
  }

  const list: FlowNodeItem[] = []
  for (const n of nodes) {
    const node = nodeMap.value.get(n.id)
    if (!node) continue
    const dagrePos = posById[n.id] ?? { x: 0, y: 0 }
    const position = savedPos[n.id] ?? dagrePos
    const s = schedule.get(n.id)
    list.push({
      id: n.id,
      type: 'workPackage',
      position,
      data: {
        node,
        isCritical: s?.isCritical ?? false,
        slack: s?.slack,
      } as WorkPackageData,
    })
  }

  const edges: Edge[] = []
  for (const e of edgePairs) {
    const sourceS = schedule.get(e.v)
    const targetS = schedule.get(e.w)
    const isCriticalEdge =
      Boolean(sourceS?.isCritical && targetS?.isCritical) &&
      targetS?.es === sourceS?.ef
    edges.push({
      id: `e-${e.v}-${e.w}`,
      source: e.v,
      target: e.w,
      type: 'smoothstep',
      style: isCriticalEdge
        ? { stroke: 'var(--destructive)', strokeWidth: 2.5 }
        : undefined,
      class: isCriticalEdge ? 'critical-edge' : undefined,
    })
  }
  flowNodes.value = list
  flowEdges.value = edges
}

const emit = defineEmits<{
  /** 從 source 拖到 target：target 新增 source 為前置 */
  'add-dependency': [sourceNodeId: string, targetNodeId: string]
  /** 使用者刪除連線（選取連線後按 Delete）：從 target 的前置移除 source */
  'remove-dependency': [sourceNodeId: string, targetNodeId: string]
}>()

/** 切換工作包／樹變動時 Vue Flow 可能送出 remove，勿當成使用者刪除前置 */
let ignoreEdgeRemoveUntil = 0
function scheduleIgnoreEdgeRemoves(ms: number) {
  ignoreEdgeRemoveUntil =
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) + ms
}

watch(
  () => [props.wbsTree, props.workPackageIds] as const,
  () => scheduleIgnoreEdgeRemoves(180),
  { deep: true }
)

watch(
  () => [props.wbsTree, props.workPackageIds, props.taskDependencies] as const,
  () => buildGraph(),
  { immediate: true, deep: true }
)

/** 使用者拖曳節點結束時寫入目前位置 */
function onNodeDragStop(ev: { node: { id: string; position: { x: number; y: number } } }) {
  const { id, position } = ev.node
  const idx = flowNodes.value.findIndex((n) => n.id === id)
  if (idx >= 0) {
    flowNodes.value = flowNodes.value.map((n, i) =>
      i === idx ? { ...n, position } : n
    )
    savePositionsToStorage()
  }
}

/** 使用者從節點 A 的 source handle 拖到節點 B 的 target handle 時：B 的前置加入 A */
function onConnect(ev: Connection | null) {
  if (!ev?.source || !ev?.target || ev.source === ev.target) return
  emit('add-dependency', ev.source, ev.target)
}

function onEdgesChange(changes: EdgeChange[]) {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now < ignoreEdgeRemoveUntil) return
  for (const ch of changes) {
    if (ch.type !== 'remove') continue
    if (!('source' in ch) || !ch.source || !ch.target) continue
    const preds = props.taskDependencies[ch.target] ?? []
    if (!preds.includes(ch.source)) continue
    emit('remove-dependency', ch.source, ch.target)
  }
}
</script>
<template>
  <div class="relative h-[560px] w-full rounded-lg border border-border bg-muted/30">
    <template v-if="flowNodes.length > 0">
      <VueFlow
        :nodes="flowNodesForFlow"
        :edges="flowEdgesForFlow"
        :nodes-draggable="true"
        :nodes-connectable="true"
        :connection-mode="ConnectionMode.Strict"
        :elements-selectable="true"
        :fit-view-on-init="true"
        class="rounded-lg"
        @node-drag-stop="onNodeDragStop"
        @connect="onConnect"
        @edges-change="onEdgesChange"
      >
        <template #node-workPackage="props">
          <WorkPackageNode v-bind="props" />
        </template>
        <Background pattern-color="var(--border)" :gap="16" />
      </VueFlow>
    </template>
    <div
      v-else
      class="flex h-full items-center justify-center rounded-lg text-center text-sm text-muted-foreground"
    >
      <p>
        請在「列表」分頁勾選「工作包」，網路圖將只顯示工作包及其前後關係。<br />
        前置與甘特圖共用；<strong class="text-foreground">點選連線後按 Delete</strong>可移除並會儲存。
      </p>
    </div>
  </div>
</template>
