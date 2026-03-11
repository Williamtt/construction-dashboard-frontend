<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 目標數值 */
    value: number
    /** 動畫時長（ms） */
    duration?: number
    /** 小數位數 */
    decimals?: number
    /** 後綴（如 " 天"、"%"、" 億元"） */
    suffix?: string
    /** 前綴（如 "$"） */
    prefix?: string
    /** 是否在掛載時播放動畫（若 false 則直接顯示目標值） */
    animateOnMount?: boolean
  }>(),
  {
    duration: 1000,
    decimals: 0,
    suffix: '',
    prefix: '',
    animateOnMount: true,
  }
)

const displayValue = ref(props.animateOnMount ? 0 : props.value)
const scale = ref(props.animateOnMount ? 0.85 : 1)
let rafId = 0
let startTime = 0
let startValue = 0

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function runAnimation() {
  startValue = displayValue.value
  startTime = 0

  const tick = (timestamp: number) => {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / props.duration, 1)
    const eased = easeOutCubic(progress)

    displayValue.value = startValue + (props.value - startValue) * eased
    scale.value = 0.85 + 0.15 * eased

    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      displayValue.value = props.value
      scale.value = 1
    }
  }

  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(tick)
}

const formatted = computed(() => {
  const num = displayValue.value.toFixed(props.decimals)
  return `${props.prefix}${num}${props.suffix}`
})

watch(() => props.value, () => {
  runAnimation()
}, { immediate: false })

onMounted(() => {
  if (props.animateOnMount) {
    runAnimation()
  } else {
    displayValue.value = props.value
    scale.value = 1
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <span
    class="inline-block tabular-nums transition-transform duration-150"
    :style="{ transform: `scale(${scale})` }"
  >
    {{ formatted }}
  </span>
</template>
