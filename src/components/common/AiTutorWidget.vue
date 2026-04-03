<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAiTutorStore } from '@/stores/aiTutor'
import { useIsMobile } from '@/composables'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

const store = useAiTutorStore()
const route = useRoute()
const isMobile = useIsMobile()
const inputText = ref('')
const messagesEndRef = ref<HTMLElement | null>(null)

const pageContext = computed(() => {
  const path = route.path
  if (path.includes('/diary') || path.includes('/daily-log')) return '施工日誌'
  if (path.includes('/valuation')) return '估驗計價'
  if (path.includes('/inspection')) return '自主檢查'
  if (path.includes('/defect')) return '缺失改善'
  if (path.includes('/repair')) return '報修'
  if (path.includes('/schedule')) return '進度管理'
  return ''
})

function scrollToBottom() {
  nextTick(() => {
    messagesEndRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
}

watch(() => store.messages.length, scrollToBottom)

async function handleSend() {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  await store.send(text, pageContext.value || undefined)
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function formatContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
    .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
}
</script>

<template>
  <!-- FAB Button -->
  <button
    class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-primary-foreground shadow-lg transition-transform hover:scale-105"
    title="AI 學習助教"
    @click="store.toggle()"
  >
    &#x1F393;
  </button>

  <!-- Chat Panel -->
  <Sheet :open="store.isOpen" @update:open="(v: boolean) => v ? store.toggle() : store.close()">
    <SheetContent
      :side="isMobile ? 'bottom' : 'right'"
      :class="isMobile ? 'h-[80vh]' : 'w-[400px]'"
      class="flex flex-col p-0"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
        <span class="text-sm font-semibold">AI 學習助教</span>
        <div class="flex gap-2">
          <button
            class="rounded px-2 py-1 text-xs opacity-80 hover:opacity-100 hover:bg-white/15"
            title="開啟新對話"
            @click="store.startNew()"
          >
            &#x1F5D8;
          </button>
        </div>
      </div>

      <!-- Messages -->
      <ScrollArea class="flex-1 px-4 py-3">
        <div class="flex flex-col gap-3">
          <div
            v-for="(msg, i) in store.messages"
            :key="i"
            :class="[
              'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'self-end bg-primary text-primary-foreground rounded-br-sm'
                : 'self-start bg-muted text-foreground rounded-bl-sm',
            ]"
            v-html="formatContent(msg.content)"
          />

          <!-- Loading -->
          <div
            v-if="store.isLoading"
            class="max-w-[85%] self-start rounded-xl rounded-bl-sm bg-muted px-3 py-2 text-sm italic text-muted-foreground"
          >
            思考中...
          </div>

          <!-- Sources -->
          <div
            v-if="store.sources.length > 0 && !store.isLoading"
            class="self-start text-xs text-muted-foreground"
          >
            參考：{{ store.sources.map(s => s.title).join('、') }}
          </div>

          <div ref="messagesEndRef" />
        </div>
      </ScrollArea>

      <!-- Input -->
      <div class="flex gap-2 border-t bg-background p-3">
        <textarea
          v-model="inputText"
          class="flex-1 resize-none rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:border-primary"
          placeholder="輸入問題..."
          rows="1"
          @keydown="handleKeydown"
        />
        <Button
          size="icon"
          class="h-9 w-9 shrink-0 rounded-full"
          :disabled="store.isLoading || !inputText.trim()"
          @click="handleSend"
        >
          &#x27A4;
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
