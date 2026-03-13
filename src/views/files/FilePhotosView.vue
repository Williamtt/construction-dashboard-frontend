<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold text-foreground">照片管理</h1>
    <Card>
      <CardHeader>
        <CardTitle>專案照片</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          管理專案現場照片、相簿與圖檔。此頁面待串接照片 API 後實作。
        </p>
      </CardContent>
    </Card>
  </div>
</template>
