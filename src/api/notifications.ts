import { apiClient } from './client'
import { API_PATH } from '@/constants'

export type NotificationType = 'alert_alarm' | 'alert_attention' | 'repair_request' | 'defect' | 'system'

export interface NotificationItem {
  id: string
  userId: string
  tenantId: string | null
  projectId: string | null
  type: NotificationType
  title: string
  body: string
  link: string | null
  sourceId: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

export async function fetchNotifications(limit = 50): Promise<NotificationItem[]> {
  const { data } = await apiClient.get<{ data: NotificationItem[] }>(API_PATH.NOTIFICATIONS, {
    params: { limit },
  })
  return data.data ?? []
}

export async function fetchUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>(API_PATH.NOTIFICATIONS_UNREAD_COUNT)
  return data.count ?? 0
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(API_PATH.NOTIFICATION_READ(id))
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch(API_PATH.NOTIFICATIONS_READ_ALL)
}
