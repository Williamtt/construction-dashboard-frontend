<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { forgotPassword } from '@/api/auth'
import { ROUTE_PATH } from '@/constants'

const router = useRouter()
const email = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  if (!email.value.trim()) {
    errorMessage.value = '請輸入 Email'
    return
  }
  loading.value = true
  try {
    successMessage.value = await forgotPassword(email.value.trim())
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    errorMessage.value = err.response?.data?.error?.message ?? '操作失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="border-border bg-card">
    <CardHeader class="space-y-1">
      <CardTitle class="text-xl text-foreground">忘記密碼</CardTitle>
      <CardDescription class="text-muted-foreground">
        輸入您的 Email，系統將寄送密碼重設連結
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div
        v-if="successMessage"
        class="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        <p>{{ successMessage }}</p>
        <Button variant="link" class="mt-2 h-auto p-0" @click="router.push(ROUTE_PATH.LOGIN)">
          返回登入頁
        </Button>
      </div>

      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-2">
          <label for="fp-email" class="text-sm font-medium text-foreground">Email</label>
          <Input
            id="fp-email"
            v-model="email"
            type="email"
            placeholder="your@email.com"
            autocomplete="email"
            class="border-border bg-background text-foreground"
          />
        </div>
        <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? '送出中…' : '寄送重設連結' }}
        </Button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        <Button variant="link" class="h-auto p-0" @click="router.push(ROUTE_PATH.LOGIN)">
          ← 返回登入
        </Button>
      </p>
    </CardContent>
  </Card>
</template>
