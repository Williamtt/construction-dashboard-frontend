<script setup lang="ts">
import { useRoute } from 'vue-router'
import { AlertCircle } from 'lucide-vue-next'

useRoute()

// 手機版獨立：缺失改善列表（之後接 API）
</script>

<template>
  <div class="mobile-page px-4 pb-6 pt-4">
    <h2 class="mb-4 text-lg font-semibold text-foreground">缺失改善</h2>

    <div
      class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center"
    >
      <AlertCircle class="mb-3 size-12 text-muted-foreground" aria-hidden />
      <p class="text-sm font-medium text-foreground">缺失列表</p>
      <p class="mt-1 text-sm text-muted-foreground">待改善與已完成項目將顯示於此</p>
    </div>
  </div>
</template>
