import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  /** 桌面：側欄是否收合（只顯示 icon） */
  const collapsed = ref(false)
  /** 手機：側欄 Sheet 是否開啟 */
  const mobileOpen = ref(false)

  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function toggleMobileOpen() {
    mobileOpen.value = !mobileOpen.value
  }

  function setMobileOpen(open: boolean) {
    mobileOpen.value = open
  }

  return {
    collapsed,
    mobileOpen,
    toggleCollapsed,
    toggleMobileOpen,
    setMobileOpen,
  }
})
