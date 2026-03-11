<script setup lang="ts">
import { cn } from '@/lib/utils'

const props = defineProps<{
  label: string
  value: string
  selected?: boolean
  class?: string
}>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        'hover:bg-muted/50',
        selected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
          : 'border-border bg-card',
        props.class,
      )
    "
    @click="emit('click')"
  >
    <span
      :class="
        selected ? 'text-primary' : 'text-muted-foreground'
      "
      class="shrink-0"
    >
      <slot name="icon" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-foreground">
        {{ props.label }}
      </p>
      <p class="text-lg font-semibold tabular-nums text-foreground">
        {{ props.value }}
      </p>
    </div>
  </button>
</template>
