<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode, AccentScheme } from '@/constants/theme'
import { changePassword, getMe, uploadAvatar } from '@/api/auth'
import { useUserAvatarUrl } from '@/composables/useUserAvatarUrl'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Lock, Loader2, SlidersHorizontal, Upload } from 'lucide-vue-next'

const SECTIONS = [
  { id: 'preferences', label: '偏好設定', icon: SlidersHorizontal },
  { id: 'account-info', label: '帳號資訊', icon: User },
  { id: 'password', label: '變更密碼', icon: Lock },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

defineProps<{
  open: boolean
}>()
const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const authStore = useAuthStore()
const themeStore = useThemeStore()

const hasAvatar = computed(() => !!authStore.user?.hasAvatar)
const { objectUrl: avatarUrl, reload: reloadAvatar } = useUserAvatarUrl(hasAvatar)

/** 姓名首字（頭貼無圖時顯示） */
const avatarInitial = computed(() => {
  const name = authStore.user?.name?.trim()
  if (name) return name.charAt(0).toUpperCase()
  const email = authStore.user?.email
  if (email) return email.charAt(0).toUpperCase()
  return '?'
})

const activeSection = ref<SectionId>('preferences')

const avatarUploading = ref(false)
const avatarError = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const passwordLoading = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

watch(() => passwordForm.value, () => {
  passwordError.value = ''
  passwordSuccess.value = ''
}, { deep: true })

async function submitChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  const { currentPassword, newPassword, confirmPassword } = passwordForm.value
  if (!currentPassword.trim()) {
    passwordError.value = '請輸入目前密碼'
    return
  }
  if (!newPassword) {
    passwordError.value = '請輸入新密碼'
    return
  }
  if (newPassword.length < 6) {
    passwordError.value = '新密碼至少 6 碼'
    return
  }
  if (newPassword !== confirmPassword) {
    passwordError.value = '兩次輸入的新密碼不一致'
    return
  }
  passwordLoading.value = true
  try {
    await changePassword({ currentPassword, newPassword })
    passwordSuccess.value = '密碼已變更'
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
      : '變更密碼失敗'
    passwordError.value = msg || '變更密碼失敗'
  } finally {
    passwordLoading.value = false
  }
}

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '淺色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟隨系統' },
]

const accentOptions: { value: AccentScheme; label: string }[] = [
  { value: 'default', label: '預設（灰）' },
  { value: 'blue', label: '藍' },
  { value: 'green', label: '綠' },
  { value: 'orange', label: '橘' },
  { value: 'violet', label: '紫' },
]

function roleLabel(role: string | undefined) {
  if (role === 'platform_admin') return '平台管理員'
  if (role === 'tenant_admin') return '租戶管理員'
  return '專案使用者'
}

function triggerAvatarUpload() {
  avatarError.value = ''
  avatarInput.value?.click()
}

async function onAvatarFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const mime = (file.type || '').toLowerCase()
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mime)) {
    avatarError.value = '僅支援 PNG、JPG、WebP 圖片'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    avatarError.value = '頭貼不得超過 2 MB'
    return
  }
  avatarUploading.value = true
  avatarError.value = ''
  try {
    await uploadAvatar(file)
    const updated = await getMe()
    authStore.setUser(updated)
    await reloadAvatar()
  } catch (err: unknown) {
    const msg = err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message
      : '上傳失敗'
    avatarError.value = (msg as string) || '上傳失敗'
  } finally {
    avatarUploading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <!-- 桌面：左右佈局；手機：單欄 + 上方選單 -->
    <DialogContent
      class="flex h-[85vh] max-h-[85vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg md:max-w-4xl md:flex-row"
    >
      <!-- 左側導航（僅桌面 md+ 顯示，樣式與外層 AppSidebar 一致） -->
      <aside
        class="hidden w-full flex-shrink-0 flex-col md:flex md:w-56 md:border-r md:border-border"
      >
        <header
          class="flex shrink-0 items-center gap-3 border-border bg-muted/30 px-3 py-4"
        >
          <Avatar class="size-7 shrink-0">
            <AvatarImage
              v-if="hasAvatar && avatarUrl"
              :src="avatarUrl"
              alt=""
            />
            <AvatarFallback class="bg-muted text-xs font-medium text-foreground">
              {{ avatarInitial }}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-foreground">
              {{ authStore.user?.name || '—' }}
            </p>
            <p class="truncate text-xs text-muted-foreground">帳號</p>
          </div>
        </header>
        <nav class="flex flex-col gap-2 p-2">
          <div
            v-for="item in SECTIONS"
            :key="item.id"
            class="flex min-h-9 items-center rounded-md pl-3"
          >
            <Button
              type="button"
              variant="ghost"
              :class="[
                'h-9 w-full justify-start gap-3 rounded-md px-3',
                activeSection === item.id && 'bg-accent text-accent-foreground',
              ]"
              @click="activeSection = item.id"
            >
              <component :is="item.icon" class="size-4 shrink-0" />
              <span class="truncate">{{ item.label }}</span>
            </Button>
          </div>
        </nav>
      </aside>

      <!-- 右側：標題 + 內容（桌面）或 手機上方選單 + 內容 -->
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <!-- 手機：區塊選單 -->
        <div class="border-b border-border px-4 py-3 md:hidden">
          <Select :model-value="activeSection" @update:model-value="(v) => (activeSection = v as SectionId)">
            <SelectTrigger class="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="item in SECTIONS"
                :key="item.id"
                :value="item.id"
              >
                {{ item.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 共用：關閉鈕由 DialogContent 提供在右上，內容區可捲動 -->
        <div class="flex-1 overflow-y-auto p-4 pr-12 pt-12 md:p-6 md:pr-14 md:pt-10">
          <DialogHeader class="mb-6 space-y-1 md:mb-8">
            <DialogTitle class="text-xl">
              {{ SECTIONS.find((s) => s.id === activeSection)?.label ?? '個人設定' }}
            </DialogTitle>
            <DialogDescription v-if="activeSection === 'preferences'">
              選擇介面外觀與行為，設定會儲存在此瀏覽器中。
            </DialogDescription>
            <DialogDescription v-else-if="activeSection === 'account-info'">
              目前登入的帳號資料。
            </DialogDescription>
            <DialogDescription v-else-if="activeSection === 'password'">
              修改登入密碼，請使用至少 6 碼。
            </DialogDescription>
          </DialogHeader>

          <!-- 偏好設定 -->
          <div v-show="activeSection === 'preferences'" class="space-y-8">
            <section>
              <h3 class="mb-4 text-sm font-semibold text-foreground">外觀</h3>
              <div class="space-y-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p class="text-sm font-medium text-foreground">主題模式</p>
                    <p class="text-xs text-muted-foreground">
                      選擇此裝置上的主題（淺色／深色／跟隨系統）
                    </p>
                  </div>
                  <Select
                    :model-value="themeStore.mode"
                    @update:model-value="(v) => themeStore.setMode(v as ThemeMode)"
                  >
                    <SelectTrigger class="w-full bg-background sm:w-48">
                      <SelectValue placeholder="選擇主題" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="opt in themeOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div>
                    <p class="text-sm font-medium text-foreground">主色（按鈕、連結、強調）</p>
                    <p class="text-xs text-muted-foreground">
                      選擇介面主要強調色，即時套用
                    </p>
                  </div>
                  <Select
                    :model-value="themeStore.accent"
                    @update:model-value="(v) => themeStore.setAccent(v as AccentScheme)"
                  >
                    <SelectTrigger class="w-full bg-background sm:w-48">
                      <SelectValue placeholder="選擇主色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="opt in accentOptions"
                        :key="opt.value"
                        :value="opt.value"
                      >
                        {{ opt.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </div>

          <!-- 帳號資訊 -->
          <div v-show="activeSection === 'account-info'" class="space-y-6">
            <section>
              <h3 class="mb-3 text-sm font-semibold text-foreground">頭貼</h3>
              <div class="flex flex-wrap items-center gap-4">
                <Avatar class="size-16 shrink-0">
                  <AvatarImage
                    v-if="hasAvatar && avatarUrl"
                    :src="avatarUrl"
                    alt=""
                  />
                  <AvatarFallback class="bg-muted text-2xl font-medium text-foreground">
                    {{ avatarInitial }}
                  </AvatarFallback>
                </Avatar>
                <div class="flex flex-col gap-2">
                  <input
                    ref="avatarInput"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    class="hidden"
                    aria-hidden
                    @change="onAvatarFileChange"
                  >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    :disabled="avatarUploading"
                    @click="triggerAvatarUpload"
                  >
                    <Upload v-if="!avatarUploading" class="mr-2 size-4" />
                    <Loader2 v-else class="mr-2 size-4 animate-spin" />
                    {{ avatarUploading ? '上傳中…' : '更換頭貼' }}
                  </Button>
                  <p class="text-xs text-muted-foreground">支援 PNG、JPG、WebP，最大 2 MB</p>
                  <p v-if="avatarError" class="text-sm text-destructive">{{ avatarError }}</p>
                </div>
              </div>
            </section>
            <div class="grid gap-1">
              <span class="text-xs font-medium text-muted-foreground">姓名</span>
              <p class="text-sm text-foreground">{{ authStore.user?.name || '—' }}</p>
            </div>
            <div class="grid gap-1">
              <span class="text-xs font-medium text-muted-foreground">Email</span>
              <p class="text-sm text-foreground">{{ authStore.user?.email || '—' }}</p>
            </div>
            <div class="grid gap-1">
              <span class="text-xs font-medium text-muted-foreground">角色</span>
              <p class="text-sm text-foreground">{{ roleLabel(authStore.user?.systemRole) }}</p>
            </div>
          </div>

          <!-- 變更密碼 -->
          <div v-show="activeSection === 'password'" class="space-y-4">
            <div class="grid gap-2">
              <label for="current-password" class="text-sm font-medium text-foreground">目前密碼</label>
              <Input
                id="current-password"
                v-model="passwordForm.currentPassword"
                type="password"
                placeholder="請輸入目前密碼"
                class="bg-background"
                autocomplete="current-password"
              />
            </div>
            <div class="grid gap-2">
              <label for="new-password" class="text-sm font-medium text-foreground">新密碼</label>
              <Input
                id="new-password"
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="至少 6 碼"
                class="bg-background"
                autocomplete="new-password"
              />
            </div>
            <div class="grid gap-2">
              <label for="confirm-password" class="text-sm font-medium text-foreground">確認新密碼</label>
              <Input
                id="confirm-password"
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="再輸入一次新密碼"
                class="bg-background"
                autocomplete="new-password"
              />
            </div>
            <p v-if="passwordError" class="text-sm text-destructive">{{ passwordError }}</p>
            <p v-if="passwordSuccess" class="text-sm text-foreground">{{ passwordSuccess }}</p>
            <Button
              type="button"
              :disabled="passwordLoading"
              @click="submitChangePassword"
            >
              <Loader2 v-if="passwordLoading" class="mr-2 size-4 animate-spin" />
              變更密碼
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
