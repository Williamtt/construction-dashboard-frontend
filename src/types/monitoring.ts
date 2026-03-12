/**
 * 監測相關型別（設備、每日數據、圖表用）
 */

/** 監測設備單筆（設備列表、設備詳情） */
export interface MonitoringDeviceItem {
  id: string
  name: string
  description: string
  status: 'online' | 'offline'
  category: string
}

/** 監測每日一筆（日期 + 當日最高、最低、平均） */
export interface MonitoringDailyRow {
  date: string
  min: number
  max: number
  avg: number
}
