import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
} from '@/api/notifications'

export const useNotificationsStore = defineStore('notifications', () => {
  const list = ref<NotificationItem[]>([])
  const loading = ref(false)
  const unreadCount = ref(0)
  let pollingTimer: ReturnType<typeof setInterval> | null = null

  const unreadList = computed(() => list.value.filter((n) => !n.isRead))

  async function fetch() {
    loading.value = true
    try {
      list.value = await fetchNotifications(50)
      unreadCount.value = list.value.filter((n) => !n.isRead).length
    } catch {
      list.value = []
    } finally {
      loading.value = false
    }
  }

  async function refreshUnreadCount() {
    try {
      unreadCount.value = await fetchUnreadCount()
    } catch {
      // silent
    }
  }

  async function markAsRead(id: string) {
    try {
      await markNotificationRead(id)
      const item = list.value.find((n) => n.id === id)
      if (item) {
        item.isRead = true
        item.readAt = new Date().toISOString()
        unreadCount.value = Math.max(0, unreadCount.value - 1)
      }
    } catch {
      // silent
    }
  }

  async function markAllAsRead() {
    try {
      await markAllNotificationsRead()
      list.value.forEach((n) => {
        n.isRead = true
        n.readAt = new Date().toISOString()
      })
      unreadCount.value = 0
    } catch {
      // silent
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling()
    fetch()
    pollingTimer = setInterval(() => refreshUnreadCount(), intervalMs)
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }

  return {
    list,
    loading,
    unreadCount,
    unreadList,
    fetch,
    refreshUnreadCount,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
  }
})
