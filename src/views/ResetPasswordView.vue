<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resetPassword } from '@/api/auth'
import { ROUTE_PATH } from '@/constants'

const router = useRouter()
const route = useRoute()

const token = ref('')
const form = reactive({ newPassword: '', confirmPassword: '' })
const loading = ref(false)
const errorMessage = ref('')
const done = ref(false)

onMounted(() => {
  const t = route.query.token
  if (typeof t === 'string' && t.length > 0) {
    token.value = t
  } else {
    errorMessage.value = '連結無效，請重新申請密碼重設'
  }
})

async function onSubmit() {
  errorMessage.value = ''
  if (form.newPassword.length < 6) {
    errorMessage.value = '新密碼至少 6 個字元'
    return
  }
  if (form.newPassword !== form.confirmPassword) {
    errorMessage.value = '兩次輸入的密碼不一致'
    return
  }
  loading.value = true
  try {
    await resetPassword(token.value, form.newPassword)
    done.value = true
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    errorMessage.value = err.response?.data?.error?.message ?? '重設失敗，連結可能已過期'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="border-border bg-card">
    <CardHeader class="space-y-1">
      <CardTitle class="text-xl text-foreground">重設密碼</CardTitle>
      <CardDescription class="text-muted-foreground">
        請輸入您的新密碼
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- 成功 -->
      <div
        v-if="done"
        class="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        <p class="font-medium">密碼已成功重設！</p>
        <p class="mt-1">請使用新密碼登入。</p>
        <Button variant="link" class="mt-2 h-auto p-0" @click="router.push(ROUTE_PATH.LOGIN)">
          前往登入
        </Button>
      </div>

      <!-- 連結無效（沒有 token） -->
      <div
        v-else-if="!token"
        class="rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
      >
        <p>{{ errorMessage }}</p>
        <Button variant="link" class="mt-2 h-auto p-0" @click="router.push(ROUTE_PATH.FORGOT_PASSWORD)">
          重新申請
        </Button>
      </div>

      <!-- 重設表單 -->
      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-2">
          <label for="new-password" class="text-sm font-medium text-foreground">新密碼</label>
          <Input
            id="new-password"
            v-model="form.newPassword"
            type="password"
            placeholder="至少 6 個字元"
            autocomplete="new-password"
            class="border-border bg-background text-foreground"
          />
        </div>
        <div class="space-y-2">
          <label for="confirm-password" class="text-sm font-medium text-foreground">確認新密碼</label>
          <Input
            id="confirm-password"
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次輸入新密碼"
            autocomplete="new-password"
            class="border-border bg-background text-foreground"
          />
        </div>
        <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>
        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? '重設中…' : '確認重設密碼' }}
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
