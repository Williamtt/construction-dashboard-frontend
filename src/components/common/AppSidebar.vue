<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  LayoutDashboard,
  LayoutGrid,
  FolderKanban,
  ClipboardCheck,
  Table2,
  type LucideIcon,
} from 'lucide-vue-next'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SIDEBAR_NAV_ITEMS } from '@/constants/navigation'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  LayoutGrid,
  FolderKanban,
  ClipboardCheck,
  Table2,
}

withDefaults(
  defineProps<{
    collapsed?: boolean
  }>(),
  { collapsed: false },
)

const route = useRoute()

const navItems = computed(() =>
  SIDEBAR_NAV_ITEMS.map((item) => ({
    ...item,
    icon: ICON_MAP[item.icon] ?? LayoutDashboard,
    isActive: route.path === item.path || (item.path !== '/' && route.path.startsWith(item.path)),
  })),
)
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <ScrollArea class="h-full">
      <nav
        class="flex flex-col gap-2 p-2"
        :class="collapsed ? 'items-center' : ''"
      >
        <RouterLink
          v-for="item in navItems"
          :key="item.id"
          v-slot="{ navigate }"
          :to="item.path"
          custom
        >
          <div
            class="flex min-h-9 items-center rounded-md"
            :class="collapsed ? 'justify-center' : ''"
          >
            <Tooltip v-if="collapsed">
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  :class="cn(
                    'h-9 w-9 shrink-0 justify-center rounded-md',
                    item.isActive && 'bg-accent text-accent-foreground',
                  )"
                  @click="navigate"
                >
                  <component :is="item.icon" class="size-4 shrink-0" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {{ item.label }}
              </TooltipContent>
            </Tooltip>
            <Button
              v-else
              variant="ghost"
              :class="cn(
                'h-9 w-full justify-start gap-3 rounded-md px-3',
                item.isActive && 'bg-accent text-accent-foreground',
              )"
              @click="navigate"
            >
              <component :is="item.icon" class="size-4 shrink-0" />
              <span class="truncate">{{ item.label }}</span>
            </Button>
          </div>
        </RouterLink>
      </nav>
    </ScrollArea>
  </TooltipProvider>
</template>
