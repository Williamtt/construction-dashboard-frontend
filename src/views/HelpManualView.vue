<script setup lang="ts">
/**
 * 操作手冊頁面：以 iframe 嵌入 public/help-manual.html
 * 使用 fixed 定位填滿 main 區域（避免 flex 佈局下 height 坍塌）
 */
import { ref, onMounted, onUnmounted } from 'vue'

const containerRef = ref<HTMLElement | null>(null)
const top = ref(0)
const left = ref(0)

function measure() {
  const el = containerRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  top.value = rect.top
  left.value = rect.left
}

let ro: ResizeObserver | null = null

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (containerRef.value?.parentElement) {
    ro.observe(containerRef.value.parentElement)
  }
})

onUnmounted(() => {
  ro?.disconnect()
})
</script>

<template>
  <div ref="containerRef" class="help-anchor" />
  <Teleport to="body">
    <iframe
      src="/help-manual.html"
      class="help-manual-iframe"
      title="操作手冊"
      frameborder="0"
      :style="{
        position: 'fixed',
        top: top + 'px',
        left: left + 'px',
        width: `calc(100vw - ${left}px)`,
        height: `calc(100vh - ${top}px)`,
        border: 'none',
        zIndex: 30,
      }"
    />
  </Teleport>
</template>

<style scoped>
.help-anchor {
  /* 佔位元素：用於量測 main 區域的起始位置 */
  width: 0;
  height: 0;
}
</style>
