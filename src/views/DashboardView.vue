<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-xl font-semibold text-foreground">儀表板</h1>

    <!-- 專案資訊 KPI 佔位 -->
    <section class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle class="text-sm font-medium text-muted-foreground">累計天數</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-semibold">— 天</p>
          <p class="text-xs text-muted-foreground">開工日期 — / 預定完工 —</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-sm font-medium text-muted-foreground">整體進度</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-semibold">— %</p>
          <p class="text-xs text-muted-foreground">計畫進度 — % / 實際進度 — %</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle class="text-sm font-medium text-muted-foreground">預算執行</CardTitle>
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-semibold">已執行 — 億元</p>
          <p class="text-xs text-muted-foreground">核定預算 — 億元 / 執行率 — %</p>
        </CardContent>
      </Card>
    </section>

    <!-- Tabs：監測數據 / 施工執行 -->
    <Tabs default-value="monitoring" class="w-full">
      <TabsList class="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="monitoring">監測數據</TabsTrigger>
        <TabsTrigger value="execution">施工執行</TabsTrigger>
      </TabsList>
      <TabsContent value="monitoring" class="space-y-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>警報專區</CardTitle>
            <span class="text-xs text-muted-foreground">更新時間: 即時監測</span>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">（警報卡片佔位）</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>環境監測數據</CardTitle>
            <span class="text-xs text-muted-foreground">更新時間: —</span>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">（溫度、濕度、PM2.5 等佔位）</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="execution" class="space-y-4">
        <Card>
          <CardHeader class="flex flex-row items-center justify-between">
            <CardTitle>施工進度趨勢</CardTitle>
            <span class="text-xs text-muted-foreground">更新時間: 每日 18:00</span>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">（折線圖佔位）</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>人力與設備分析</CardTitle>
          </CardHeader>
          <CardContent>
            <p class="text-sm text-muted-foreground">（圖表區塊佔位）</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
</template>
