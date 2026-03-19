<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ClipboardCheck, AlertCircle, Wrench, BookOpen } from 'lucide-vue-next'
import { buildMobileProjectPath } from '@/constants/routes'
import { ROUTE_PATH } from '@/constants/routes'

defineProps<{
  projectId: string
}>()

const tabs = [
  { path: ROUTE_PATH.MOBILE_INSPECTION, label: '自主檢查', icon: ClipboardCheck },
  { path: ROUTE_PATH.MOBILE_DEFECTS, label: '缺失改善', icon: AlertCircle },
  { path: ROUTE_PATH.MOBILE_REPAIR, label: '報修', icon: Wrench },
  { path: ROUTE_PATH.MOBILE_DIARY, label: '施工日誌', icon: BookOpen },
]
</script>

<template>
  <nav
    class="mobile-tabbar flex h-14 shrink-0 items-center justify-around border-t border-border bg-card safe-area-bottom"
    role="tablist"
    style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom));"
  >
    <RouterLink
      v-for="tab in tabs"
      :key="tab.path"
      :to="buildMobileProjectPath(projectId, tab.path)"
      class="mobile-tab-item flex min-h-[3rem] min-w-[3rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-none text-[11px] text-muted-foreground no-underline transition-colors touch-manipulation active:bg-muted/50 [&.router-link-active]:text-primary [&.router-link-active]:font-medium"
      :aria-current="($route.path.includes(tab.path) ? 'page' : undefined)"
    >
      <component :is="tab.icon" class="size-6 shrink-0" aria-hidden />
      <span>{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.mobile-tabbar {
  /* 最小點擊區域 48px，符合 iOS HIG / Material 規範 */
}
</style>
