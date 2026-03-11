<script setup lang="ts">
import { Switch } from '@/components/ui/switch'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="flex cursor-pointer items-center gap-2">
    <Switch
      :model-value="modelValue"
      @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    />
    <span class="text-sm text-muted-foreground whitespace-nowrap">每30秒自動切換</span>
  </label>
</template>
