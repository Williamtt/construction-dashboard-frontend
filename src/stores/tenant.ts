import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 當前租戶脈絡（用於平台方租戶管理詳情頁的麵包屑）
 */
export const useTenantStore = defineStore('tenant', () => {
  const currentTenantName = ref<string | null>(null)

  function setCurrentTenantName(name: string | null) {
    currentTenantName.value = name
  }

  return {
    currentTenantName,
    setCurrentTenantName,
  }
})
