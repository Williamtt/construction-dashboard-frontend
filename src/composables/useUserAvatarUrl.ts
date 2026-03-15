import { ref, watch, onUnmounted, type Ref } from 'vue'
import { getAvatarBlob } from '@/api/auth'

/**
 * 取得個人頭貼的 object URL（需登入，GET /auth/me/avatar）。
 * hasAvatar 為 true 時才請求；unmount 時自動 revoke。
 */
export function useUserAvatarUrl(hasAvatar: Ref<boolean>) {
  const objectUrl = ref<string | null>(null)
  const loading = ref(false)
  const error = ref(false)

  function revoke() {
    if (objectUrl.value) {
      URL.revokeObjectURL(objectUrl.value)
      objectUrl.value = null
    }
  }

  async function load() {
    if (!hasAvatar.value) {
      revoke()
      return
    }
    loading.value = true
    error.value = false
    revoke()
    try {
      const blob = await getAvatarBlob()
      objectUrl.value = URL.createObjectURL(blob)
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  watch(hasAvatar, (val) => {
    if (val) load()
    else revoke()
  }, { immediate: true })

  onUnmounted(revoke)

  return { objectUrl, loading, error, reload: load }
}
