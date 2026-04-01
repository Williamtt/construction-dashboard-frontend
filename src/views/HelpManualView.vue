<script setup lang="ts">
import manualHtml from '@/assets/help-manual.html?raw'
</script>

<template>
  <iframe
    :srcdoc="manualHtml"
    title="操作手冊"
    frameborder="0"
    style="width: 100%; border: none; min-height: 80vh; height: calc(100vh - 8rem);"
  />
</template>
