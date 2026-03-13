<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, UserPlus, KeyRound, PauseCircle, PlayCircle } from 'lucide-vue-next'
import type { TenantItem } from '@/types'

defineProps<{
  row: TenantItem
}>()

const emit = defineEmits<{
  edit: [row: TenantItem]
  addUser: [row: TenantItem]
  resetPassword: [row: TenantItem]
  toggleStatus: [row: TenantItem]
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
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('edit', row)">
        <Pencil class="size-4" />
        編輯
      </DropdownMenuItem>
      <DropdownMenuItem
        v-if="(row._count?.users ?? 0) === 0"
        class="gap-2 cursor-pointer"
        @click="emit('addUser', row)"
      >
        <UserPlus class="size-4" />
        建立帳號
      </DropdownMenuItem>
      <DropdownMenuItem
        v-if="(row._count?.users ?? 0) > 0"
        class="gap-2 cursor-pointer"
        @click="emit('resetPassword', row)"
      >
        <KeyRound class="size-4" />
        重設密碼
      </DropdownMenuItem>
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('toggleStatus', row)">
        <PauseCircle v-if="row.status === 'active'" class="size-4" />
        <PlayCircle v-else class="size-4" />
        {{ row.status === 'active' ? '停用' : '啟用' }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
