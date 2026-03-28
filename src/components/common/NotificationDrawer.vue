<template>
  <Sheet v-model:open="open">
    <SheetContent side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <SheetHeader class="flex flex-row items-center justify-between border-b px-4 py-3">
        <SheetTitle class="text-base font-semibold">通知</SheetTitle>
        <Button
          v-if="store.unreadCount > 0"
          variant="ghost"
          size="sm"
          class="h-7 text-xs text-muted-foreground"
          @click="store.markAllAsRead()"
        >
          全部標為已讀
        </Button>
      </SheetHeader>

      <Tabs v-model="activeTab" class="flex flex-1 flex-col overflow-hidden">
        <TabsList class="mx-4 mt-3 mb-2 h-8 w-auto justify-start rounded-md bg-muted p-0.5">
          <TabsTrigger value="all" class="h-7 px-3 text-xs">
            全部
            <Badge v-if="store.unreadCount > 0" class="ml-1.5 h-4 min-w-4 px-1 text-[10px]">
              {{ store.unreadCount }}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="alert" class="h-7 px-3 text-xs">警報</TabsTrigger>
          <TabsTrigger value="todo" class="h-7 px-3 text-xs">待辦</TabsTrigger>
        </TabsList>

        <ScrollArea class="flex-1">
          <TabsContent value="all" class="m-0 px-2">
            <NotificationList :items="filteredAll" @click-item="handleClickItem" />
          </TabsContent>
          <TabsContent value="alert" class="m-0 px-2">
            <NotificationList :items="filteredAlerts" @click-item="handleClickItem" />
          </TabsContent>
          <TabsContent value="todo" class="m-0 px-2">
            <NotificationList :items="filteredTodo" @click-item="handleClickItem" />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNotificationsStore } from '@/stores/notifications'
import type { NotificationItem } from '@/api/notifications'
import NotificationList from './NotificationList.vue'

const open = defineModel<boolean>('open', { default: false })
const activeTab = ref('all')
const store = useNotificationsStore()
const router = useRouter()

const ALERT_TYPES = ['alert_alarm', 'alert_attention']
const TODO_TYPES = ['repair_request', 'defect']

const filteredAll = computed(() => store.list)
const filteredAlerts = computed(() =>
  store.list.filter((n) => ALERT_TYPES.includes(n.type))
)
const filteredTodo = computed(() =>
  store.list.filter((n) => TODO_TYPES.includes(n.type))
)

async function handleClickItem(item: NotificationItem) {
  if (!item.isRead) {
    await store.markAsRead(item.id)
  }
  if (item.link) {
    open.value = false
    router.push(item.link)
  }
}
</script>
