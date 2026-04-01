<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const containerRef = ref<HTMLElement | null>(null)
const top = ref(0)

function measure() {
  const el = containerRef.value
  if (!el) return
  top.value = el.getBoundingClientRect().top
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
      class="mobile-help-iframe"
      title="操作手冊"
      frameborder="0"
      :style="{
        position: 'fixed',
        top: top + 'px',
        left: '0',
        width: '100vw',
        height: `calc(100vh - ${top}px)`,
        border: 'none',
        zIndex: 30,
      }"
    />
  </Teleport>
</template>

<style scoped>
.help-anchor {
  width: 0;
  height: 0;
}
</style>
