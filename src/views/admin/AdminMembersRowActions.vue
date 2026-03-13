<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, PauseCircle, PlayCircle } from 'lucide-vue-next'
import type { AdminUserItem } from '@/types'

defineProps<{
  row: AdminUserItem
}>()

const emit = defineEmits<{
  view: [row: AdminUserItem]
  toggleStatus: [row: AdminUserItem]
}>()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" aria-label="更多">
        <MoreHorizontal class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-[10rem]">
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('view', row)">
        <Eye class="size-4" />
        檢視
      </DropdownMenuItem>
      <DropdownMenuItem
        v-if="(row.status ?? 'active') === 'suspended'"
        class="gap-2 cursor-pointer"
        @click="emit('toggleStatus', row)"
      >
        <PlayCircle class="size-4" />
        啟用
      </DropdownMenuItem>
      <DropdownMenuItem
        v-else
        class="gap-2 cursor-pointer text-destructive focus:text-destructive"
        @click="emit('toggleStatus', row)"
      >
        <PauseCircle class="size-4" />
        停用
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
