<script setup lang="ts">
import rawHtml from '@/assets/help-manual.html?raw'

/**
 * 注入覆蓋樣式：隱藏手冊自帶的側欄 / 漢堡 / overlay，內容全寬顯示。
 * 插在 </head> 前確保優先級。
 */
const overrideCss = `<style>
  .sidebar, .hamburger, .overlay { display: none !important; }
  .main { margin-left: 0 !important; max-width: 100% !important; padding: 24px 32px 60px !important; }
</style>`

const manualHtml = rawHtml.replace('</head>', `${overrideCss}\n</head>`)
</script>

<template>
  <iframe
    :srcdoc="manualHtml"
    title="操作手冊"
    frameborder="0"
    style="width: 100%; border: none; min-height: 80vh; height: calc(100vh - 8rem);"
  />
</template>
