import { ref, onMounted, onUnmounted } from 'vue'

/** Tailwind md = 768px，小於為手機 */
const MEDIA_MOBILE = '(max-width: 767px)'

/**
 * 回傳是否為手機寬度（< 768px）
 */
export function useIsMobile() {
  const isMobile = ref(false)

  function update() {
    isMobile.value = window.matchMedia(MEDIA_MOBILE).matches
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return isMobile
}
