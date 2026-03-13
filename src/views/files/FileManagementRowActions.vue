<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Download, Trash2 } from 'lucide-vue-next'
import type { AttachmentItem } from '@/api/files'

defineProps<{
  row: AttachmentItem
}>()

const emit = defineEmits<{
  download: [row: AttachmentItem]
  delete: [row: AttachmentItem]
}>()

function onDownload(row: AttachmentItem) {
  emit('download', row)
}

function onDelete(row: AttachmentItem) {
  emit('delete', row)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" aria-label="更多">
        <MoreHorizontal class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[10rem]">
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="onDownload(row)">
        <Download class="size-4" />
        下載
      </DropdownMenuItem>
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
