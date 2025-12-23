<template>
  <span>
    <span class="integer-part">{{ formatNumber(integerPart, 0) }}</span>
    <span class="decimal-part" v-if="decimalPart">{{ decimalPart }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { formatNumber } from '@/utils/format'

interface Props {
  value: number | string
  duration?: number
  increment?: number
  autoIncrement?: boolean
  incrementInterval?: number
  incrementAmount?: number
  cacheKey?: string // 添加缓存键名属性
  useCache?: boolean // 是否使用缓存
}

const props = withDefaults(defineProps<Props>(), {
  duration: 1000,
  increment: 0.00000001,
  autoIncrement: false,
  incrementInterval: 100,
  incrementAmount: 0.00000001,
  cacheKey: '', // 默认空字符串表示不使用缓存
  useCache: false // 默认不使用缓存
})

const displayValue = ref('0')
const currentValue = ref(0)
const targetValue = ref(0)
const animationId = ref<number | null>(null)
const incrementTimer = ref<number | null>(null)

// 计算整数和小数部分
const integerPart = computed(() => {
  const parts = displayValue.value.split('.')
  return parts[0]
})

// 动态小数位数计算
const dynamicDecimals = computed(() => {
  const value = typeof props.value == "number" ? props.value : parseFloat(props.value)

  // 处理特殊情况
  if (value < 1) {
    return 12
  }

  // 使用数学方法计算小数位数
  // 计算整数部分的位数，然后映射到小数位数
  const integerDigits = Math.floor(Math.log10(value)) + 1

  // 根据整数位数返回相应的小数位数
  // 位数越多，小数位数越少
  const decimals = Math.max(2, 12 - integerDigits)

  // 确保小数位数在合理范围内 (2-12)
  return Math.min(12, Math.max(2, decimals))
})

const decimalPart = computed(() => {
  const parts = displayValue.value.split('.')
  return parts.length > 1 ? '.' + parts[1] : ''
})

const curFormatNumber = (num: number): string => {
  return num.toFixed(dynamicDecimals.value)
}

// 保存数据到缓存
const saveToCache = (value: number) => {
  if (props.useCache && props.cacheKey) {
    try {
      value += props.incrementAmount;
      localStorage.setItem(`animated-number-${props.cacheKey}`, value.toString())
    } catch (error) {
      console.error('Failed to save to cache:', error)
    }
  }
}

// 从缓存加载数据
const loadFromCache = (): number | null => {
  if (props.useCache && props.cacheKey) {
    try {
      const cachedValue = localStorage.getItem(`animated-number-${props.cacheKey}`)
      if (cachedValue) {
        return parseFloat(cachedValue)
      }
    } catch (error) {
      console.error('Failed to load from cache:', error)
    }
  }
  return null
}

const animateToTarget = () => {
  const startValue = currentValue.value
  const endValue = targetValue.value
  const startTime = Date.now()

  const animate = () => {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / props.duration, 1)

    // 使用缓动函数，让动画更自然
    const easeOutQuart = 1 - Math.pow(1 - progress, 4)

    currentValue.value = startValue + (endValue - startValue) * easeOutQuart
    displayValue.value = curFormatNumber(currentValue.value)

    if (progress < 1) {
      animationId.value = requestAnimationFrame(animate)
    } else {
      currentValue.value = endValue
      displayValue.value = curFormatNumber(endValue)
      // 动画完成后保存到缓存
      saveToCache(endValue)
    }
  }

  animate()
}

const startAutoIncrement = () => {
  if (!props.autoIncrement) return

  incrementTimer.value = window.setInterval(() => {
    targetValue.value += props.incrementAmount
    animateToTarget()
  }, props.incrementInterval)
}

const stopAutoIncrement = () => {
  if (incrementTimer.value) {
    clearInterval(incrementTimer.value)
    incrementTimer.value = null
  }
}

watch(
  () => props.value,
  (newValue) => {
    const numValue = typeof newValue === 'string' ? parseFloat(newValue) : newValue
    if (!isNaN(numValue) && numValue !== targetValue.value) {
      // 从缓存加载数据进行比较
      const cachedValue = loadFromCache()

      // 如果有缓存值，且当前值小于缓存值，则使用缓存值
      if (cachedValue !== null && numValue < cachedValue) {
        // 保持使用缓存中的较大值
        targetValue.value = cachedValue
      } else {
        // 否则使用新值
        targetValue.value = numValue
      }

      animateToTarget()
    }
  },
  { immediate: true }
)

watch(
  () => props.autoIncrement,
  (newValue) => {
    if (newValue) {
      startAutoIncrement()
    } else {
      stopAutoIncrement()
    }
  },
  { immediate: true }
)

onMounted(() => {
  // 尝试从缓存加载初始值
  const cachedValue = loadFromCache()
  const propValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value

  // 如果有缓存值，且当前值小于缓存值，则使用缓存值
  let initialValue = propValue
  if (cachedValue !== null) {
    initialValue = propValue < cachedValue ? cachedValue : propValue
  }

  if (!isNaN(initialValue)) {
    currentValue.value = initialValue
    targetValue.value = initialValue
    displayValue.value = curFormatNumber(initialValue)
  }

  if (props.autoIncrement) {
    startAutoIncrement()
  }
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
  stopAutoIncrement()

  // 组件卸载时保存当前值到缓存
  if (props.useCache && props.cacheKey) {
    saveToCache(currentValue.value)
  }
})
</script>

<style scoped>
.decimal-part {
  font-size: 0.8em;
}
</style>