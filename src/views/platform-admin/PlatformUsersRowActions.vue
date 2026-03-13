<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, KeyRound } from 'lucide-vue-next'
import type { PlatformUserItem } from '@/api/platform'

defineProps<{
  row: PlatformUserItem
}>()

const emit = defineEmits<{
  resetPassword: [row: PlatformUserItem]
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
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('resetPassword', row)">
        <KeyRound class="size-4" />
        重設密碼
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
