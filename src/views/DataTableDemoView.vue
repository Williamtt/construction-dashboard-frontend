<script setup lang="ts">
import { ref } from 'vue'
import { DataTable } from '@/components/common/data-table'
import { columns } from './data-table-demo/columns'
import type { Payment } from './data-table-demo/columns'

const data = ref<Payment[]>([
  { id: '1', amount: 31600, status: 'success', email: 'user1@example.com' },
  { id: '2', amount: 24200, status: 'success', email: 'user2@example.com' },
  { id: '3', amount: 83700, status: 'processing', email: 'user3@example.com' },
  { id: '4', amount: 87400, status: 'success', email: 'user4@example.com' },
  { id: '5', amount: 72100, status: 'failed', email: 'user5@example.com' },
  { id: '6', amount: 100, status: 'pending', email: 'pending@example.com' },
  { id: '7', amount: 12500, status: 'processing', email: 'process@example.com' },
  { id: '8', amount: 50000, status: 'success', email: 'pay@example.com' },
  { id: '9', amount: 3300, status: 'failed', email: 'fail@example.com' },
  { id: '10', amount: 99000, status: 'success', email: 'big@example.com' },
  { id: '11', amount: 1200, status: 'pending', email: 'small@example.com' },
  { id: '12', amount: 45600, status: 'processing', email: 'mid@example.com' },
])
</script>

<template>
  <div class="container space-y-6 py-6">
    <div>
      <h1 class="text-2xl font-semibold">DataTable 功能展示</h1>
      <p class="text-muted-foreground mt-1">
        排序、篩選、分頁、欄位顯示切換、列選取、列操作選單
      </p>
    </div>

    <DataTable
      :columns="columns"
      :data="data"
      filter-column-id="email"
      filter-placeholder="搜尋 Email..."
      :page-size="5"
    />
  </div>
</template>
