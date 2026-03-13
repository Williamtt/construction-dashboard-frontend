<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, ExternalLink } from 'lucide-vue-next'
import type { ProjectItem } from '@/types'

defineProps<{
  row: ProjectItem
}>()

const emit = defineEmits<{
  enter: [projectId: string]
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
      <DropdownMenuItem class="gap-2 cursor-pointer" @click="emit('enter', row.id)">
        <ExternalLink class="size-4" />
        進入
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
