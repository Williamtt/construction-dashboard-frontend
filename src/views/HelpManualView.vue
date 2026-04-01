<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const iframeRef = ref<HTMLIFrameElement | null>(null)

/** 讓 iframe 內連結在同一 iframe 打開（預設行為），但外部連結在新分頁開 */
function handleIframeLoad() {
  const iframe = iframeRef.value
  if (!iframe?.contentDocument) return
  // 隱藏 iframe 內部手冊的 sidebar，因為桌面版已有系統側欄
  // 手冊本身是響應式的，在 iframe 寬度充足時會顯示自己的目錄側欄
}

onMounted(() => {
  const iframe = iframeRef.value
  if (iframe) iframe.addEventListener('load', handleIframeLoad)
})

onUnmounted(() => {
  const iframe = iframeRef.value
  if (iframe) iframe.removeEventListener('load', handleIframeLoad)
})
</script>

<template>
  <div class="help-manual-container">
    <iframe
      ref="iframeRef"
      src="/help-manual.html"
      class="help-manual-iframe"
      title="操作手冊"
      frameborder="0"
    />
  </div>
</template>

<style scoped>
.help-manual-container {
  /* 填滿 main 區域（main 已是 flex-1 + overflow-y-auto） */
  margin: -1rem;       /* 抵消 main 的 p-4 */
  height: calc(100vh - 7rem); /* header(3.5rem) + breadcrumb(~2.5rem) + padding */
}

@media (min-width: 768px) {
  .help-manual-container {
    margin: -1.5rem;   /* 抵消 md:p-6 */
  }
}

.help-manual-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
