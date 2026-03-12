<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { ScheduleRowItem } from '@/types'
import { MoreHorizontal, Pencil, Eye, Trash2 } from 'lucide-vue-next'

defineProps<{
  row: ScheduleRowItem
}>()

const emit = defineEmits<{
  edit: [row: ScheduleRowItem]
  view: [row: ScheduleRowItem]
  delete: [row: ScheduleRowItem]
}>()

function onEdit(row: ScheduleRowItem) {
  emit('edit', row)
}

function onView(row: ScheduleRowItem) {
  emit('view', row)
}

function onDelete(row: ScheduleRowItem) {
  emit('delete', row)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="size-8 shrink-0"
        aria-label="更多功能"
      >
        <MoreHorizontal class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[10rem]">
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="onEdit(row)">
        <Pencil class="size-4" />
        編輯
      </DropdownMenuItem>
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="onView(row)">
        <Eye class="size-4" />
        查看
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        class="gap-2 cursor-pointer text-destructive focus:text-destructive"
        @click="onDelete(row)"
      >
        <Trash2 class="size-4" />
        刪除
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
