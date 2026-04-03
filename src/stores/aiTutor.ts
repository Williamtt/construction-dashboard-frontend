import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sendTutorMessage, getTutorHistory, newTutorConversation } from '@/api/ai-tutor'

export interface TutorMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface TutorSource {
  title: string
  category: string
}

export const useAiTutorStore = defineStore('aiTutor', () => {
  const messages = ref<TutorMessage[]>([])
  const sources = ref<TutorSource[]>([])
  const isOpen = ref(false)
  const isLoading = ref(false)
  const historyLoaded = ref(false)

  function toggle() {
    isOpen.value = !isOpen.value
    if (isOpen.value && !historyLoaded.value) {
      loadHistory()
    }
  }

  function close() {
    isOpen.value = false
  }

  async function loadHistory() {
    try {
      const res = await getTutorHistory()
      const data = res.data.data.messages
      if (data && data.length > 0) {
        messages.value = data as TutorMessage[]
      } else {
        messages.value = [{ role: 'assistant', content: '你好！我是 EAGLE 學習助教，有什麼問題想問嗎？' }]
      }
      historyLoaded.value = true
    } catch {
      messages.value = [{ role: 'assistant', content: '你好！我是 EAGLE 學習助教，有什麼問題想問嗎？' }]
    }
  }

  async function send(message: string, pageContext?: string) {
    if (!message.trim() || isLoading.value) return

    messages.value.push({ role: 'user', content: message })
    isLoading.value = true
    sources.value = []

    try {
      const res = await sendTutorMessage(message, pageContext)
      const data = res.data.data
      messages.value.push({ role: 'assistant', content: data.answer })
      sources.value = data.sources
    } catch {
      messages.value.push({ role: 'assistant', content: '抱歉，目前無法回答您的問題，請稍後再試。' })
    } finally {
      isLoading.value = false
    }
  }

  async function startNew() {
    try {
      await newTutorConversation()
      messages.value = [{ role: 'assistant', content: '你好！有什麼問題想問嗎？' }]
      sources.value = []
      historyLoaded.value = true
    } catch {
      // silent
    }
  }

  return { messages, sources, isOpen, isLoading, toggle, close, send, startNew, loadHistory }
})
