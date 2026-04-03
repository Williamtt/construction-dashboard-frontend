import { apiClient } from './client'

export interface TutorSource {
  title: string
  category: string
}

export interface TutorChatResponse {
  data: {
    answer: string
    sources: TutorSource[]
  }
}

export interface TutorHistoryResponse {
  data: {
    messages: Array<{ role: string; content: string }>
  }
}

export function sendTutorMessage(message: string, pageContext?: string) {
  return apiClient.post<TutorChatResponse>('/api/v1/ai-tutor/chat', {
    message,
    page_context: pageContext,
  })
}

export function getTutorHistory() {
  return apiClient.get<TutorHistoryResponse>('/api/v1/ai-tutor/history')
}

export function newTutorConversation() {
  return apiClient.post('/api/v1/ai-tutor/new')
}
