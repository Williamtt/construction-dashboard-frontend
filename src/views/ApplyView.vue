<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitApplication } from '@/api/application'
import { ROUTE_PATH } from '@/constants'

const router = useRouter()

const form = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
  studentId: '',
  department: '',
  tenantSlug: '',
})
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function onSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!form.name.trim()) {
    errorMessage.value = '請輸入姓名'
    return
  }
  if (!form.email.trim()) {
    errorMessage.value = '請輸入學校 Email'
    return
  }
  if (!form.password || form.password.length < 6) {
    errorMessage.value = '密碼至少 6 個字元'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMessage.value = '兩次密碼不一致'
    return
  }
  if (!form.tenantSlug.trim()) {
    errorMessage.value = '請輸入租戶代碼'
    return
  }

  loading.value = true
  try {
    const result = await submitApplication({
      email: form.email.trim(),
      password: form.password,
      name: form.name.trim(),
      studentId: form.studentId.trim() || undefined,
      department: form.department.trim() || undefined,
      tenantSlug: form.tenantSlug.trim(),
    })
    successMessage.value = result.message
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: { message?: string } } } }
    errorMessage.value =
      err.response?.data?.error?.message ?? '申請失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="border-border bg-card">
    <CardHeader class="space-y-1">
      <CardTitle class="text-xl text-foreground">申請帳號</CardTitle>
      <CardDescription class="text-muted-foreground">
        填寫以下資訊申請帳號，審核通過後將收到通知信
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <!-- 成功訊息 -->
      <div
        v-if="successMessage"
        class="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
      >
        <p class="font-medium">{{ successMessage }}</p>
        <p class="mt-2">審核通過後您將收到 Email 通知，届時即可使用申請時設定的密碼登入。</p>
        <Button variant="link" class="mt-2 h-auto p-0" @click="router.push(ROUTE_PATH.LOGIN)">
          返回登入頁
        </Button>
      </div>

      <!-- 申請表單 -->
      <form v-else class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-2">
          <label for="name" class="text-sm font-medium text-foreground">姓名 *</label>
          <Input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="王小明"
            autocomplete="name"
            class="border-border bg-background text-foreground"
          />
        </div>
        <div class="space-y-2">
          <label for="email" class="text-sm font-medium text-foreground">學校 Email *</label>
          <Input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="s1234567@stu.edu.tw"
            autocomplete="email"
            class="border-border bg-background text-foreground"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label for="studentId" class="text-sm font-medium text-foreground">學號</label>
            <Input
              id="studentId"
              v-model="form.studentId"
              type="text"
              placeholder="1234567"
              class="border-border bg-background text-foreground"
            />
          </div>
          <div class="space-y-2">
            <label for="department" class="text-sm font-medium text-foreground">系所/班級</label>
            <Input
              id="department"
              v-model="form.department"
              type="text"
              placeholder="土木工程系三年級"
              class="border-border bg-background text-foreground"
            />
          </div>
        </div>
        <div class="space-y-2">
          <label for="apply-password" class="text-sm font-medium text-foreground">設定密碼 *</label>
          <Input
            id="apply-password"
            v-model="form.password"
            type="password"
            placeholder="至少 6 個字元"
            autocomplete="new-password"
            class="border-border bg-background text-foreground"
          />
        </div>
        <div class="space-y-2">
          <label for="confirm-password" class="text-sm font-medium text-foreground">確認密碼 *</label>
          <Input
            id="confirm-password"
            v-model="form.confirmPassword"
            type="password"
            placeholder="再次輸入密碼"
            autocomplete="new-password"
            class="border-border bg-background text-foreground"
          />
        </div>
        <div class="space-y-2">
          <label for="tenantSlug" class="text-sm font-medium text-foreground">租戶代碼 *</label>
          <Input
            id="tenantSlug"
            v-model="form.tenantSlug"
            type="text"
            placeholder="由授課教師提供"
            class="border-border bg-background text-foreground"
          />
          <p class="text-xs text-muted-foreground">請向授課教師取得租戶代碼</p>
        </div>

        <p v-if="errorMessage" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <Button type="submit" class="w-full" :disabled="loading">
          {{ loading ? '送出中…' : '送出申請' }}
        </Button>
      </form>

      <p class="text-center text-sm text-muted-foreground">
        已有帳號？
        <Button variant="link" class="h-auto p-0" @click="router.push(ROUTE_PATH.LOGIN)">
          返回登入
        </Button>
      </p>
    </CardContent>
  </Card>
</template>
