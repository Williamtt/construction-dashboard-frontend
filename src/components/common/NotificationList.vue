<template>
  <div v-if="items.length === 0" class="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
    <BellOff class="size-8 opacity-40" />
    <p class="text-sm">目前沒有通知</p>
  </div>
  <ul v-else class="divide-y divide-border">
    <li
      v-for="item in items"
      :key="item.id"
      class="flex cursor-pointer gap-3 px-2 py-3 transition-colors hover:bg-accent"
      :class="{ 'opacity-60': item.isRead }"
      @click="$emit('click-item', item)"
    >
      <div class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full" :class="iconBg(item.type)">
        <component :is="iconComponent(item.type)" class="size-4" :class="iconColor(item.type)" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <p class="truncate text-sm font-medium leading-tight">{{ item.title }}</p>
          <span v-if="!item.isRead" class="mt-1 size-2 shrink-0 rounded-full bg-primary" />
        </div>
        <p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{{ item.body }}</p>
        <p class="mt-1 text-[10px] text-muted-foreground">{{ formatTime(item.createdAt) }}</p>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { AlertTriangle, AlertCircle, Wrench, ClipboardList, Info, BellOff } from 'lucide-vue-next'
import type { NotificationItem, NotificationType } from '@/api/notifications'

defineProps<{ items: NotificationItem[] }>()
defineEmits<{ 'click-item': [item: NotificationItem] }>()

function iconComponent(type: NotificationType) {
  const map = {
    alert_alarm: AlertTriangle,
    alert_attention: AlertCircle,
    repair_request: Wrench,
    defect: ClipboardList,
    system: Info,
  }
  return map[type] ?? Info
}

function iconBg(type: NotificationType) {
  const map: Record<NotificationType, string> = {
    alert_alarm: 'bg-red-500/15',
    alert_attention: 'bg-yellow-500/15',
    repair_request: 'bg-blue-500/15',
    defect: 'bg-orange-500/15',
    system: 'bg-muted',
  }
  return map[type]
}

function iconColor(type: NotificationType) {
  const map: Record<NotificationType, string> = {
    alert_alarm: 'text-red-500',
    alert_attention: 'text-yellow-500',
    repair_request: 'text-blue-500',
    defect: 'text-orange-500',
    system: 'text-muted-foreground',
  }
  return map[type]
}

function formatTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return '剛剛'
  if (diffMin < 60) return `${diffMin} 分鐘前`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} 小時前`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} 天前`
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
}
</script>
