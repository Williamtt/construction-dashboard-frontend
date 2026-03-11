<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const route = useRoute()
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold text-foreground">Layout 驗證頁</h1>
    <p class="text-muted-foreground">
      此頁用於驗證 Phase 0～Phase 2：Header、Sidebar、儀表板路由與 Tabs 區塊是否正常運作。
    </p>

    <section class="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>驗證項目</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <ul class="list-inside list-disc space-y-1">
            <li>上方應有 Header（選單按鈕、標題、通知、使用者）</li>
            <li>左側應有 Sidebar（首頁、儀表板、專案列表）</li>
            <li>桌面：點選單按鈕可收合/展開 Sidebar</li>
            <li>手機：點選單按鈕應從左側滑出 Sheet 導航</li>
            <li>點 Sidebar 連結可切換至首頁、儀表板</li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>目前路由</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="font-mono text-sm text-muted-foreground">{{ route.path }}</p>
        </CardContent>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>快速導航</CardTitle>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <RouterLink
          to="/"
          class="text-primary underline underline-offset-4 hover:no-underline"
        >
          首頁
        </RouterLink>
        <RouterLink
          to="/dashboard"
          class="text-primary underline underline-offset-4 hover:no-underline"
        >
          儀表板
        </RouterLink>
        <RouterLink
          to="/layout-verify"
          class="text-primary underline underline-offset-4 hover:no-underline"
        >
          Layout 驗證頁（本頁）
        </RouterLink>
      </CardContent>
    </Card>
  </div>
</template>
