<script setup lang="ts">
import rawHtml from '@/assets/help-manual.html?raw'

const overrideCss = `<style>
  .sidebar, .hamburger, .overlay { display: none !important; }
  .main { margin-left: 0 !important; max-width: 100% !important; padding: 16px 16px 60px !important; }
</style>`

const manualHtml = rawHtml.replace('</head>', `${overrideCss}\n</head>`)
</script>

<template>
  <iframe
    :srcdoc="manualHtml"
    title="操作手冊"
    frameborder="0"
    style="width: 100%; border: none; height: calc(100vh - 7rem);"
  />
</template>
