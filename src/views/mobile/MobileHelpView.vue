<script setup lang="ts">
import manualHtml from '@/assets/help-manual.html?raw'
</script>

<template>
  <iframe
    :srcdoc="manualHtml"
    title="操作手冊"
    frameborder="0"
    style="width: 100%; border: none; height: calc(100vh - 7rem);"
  />
</template>
