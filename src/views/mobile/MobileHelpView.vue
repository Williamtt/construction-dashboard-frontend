<script setup lang="ts">
</script>

<template>
  <div class="mobile-help-container">
    <iframe
      src="/help-manual.html"
      class="mobile-help-iframe"
      title="操作手冊"
      frameborder="0"
    />
  </div>
</template>

<style scoped>
.mobile-help-container {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.mobile-help-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}
</style>
