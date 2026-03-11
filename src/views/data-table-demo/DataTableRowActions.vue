<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Payment } from './columns'

defineProps<{
  payment: Payment
}>()

function copyId(id: string) {
  navigator.clipboard.writeText(id)
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button
        variant="ghost"
        class="size-8 p-0"
      >
        <span class="sr-only">開啟選單</span>
        <MoreHorizontal class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>操作</DropdownMenuLabel>
      <DropdownMenuItem @click="copyId(payment.id)">
        複製 ID
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem>檢視客戶</DropdownMenuItem>
      <DropdownMenuItem>檢視詳情</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
