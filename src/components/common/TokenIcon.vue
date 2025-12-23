<template>
  <div class="token-icon-wrapper" :class="sizeClass">
    <!-- 如果有图标则显示图片 -->
    <img 
      v-if="iconUrl" 
      :src="iconUrl" 
      :alt="symbol" 
      class="token-icon-img"
      @error="handleImageError"
    />
    <!-- 没有图标时显示前两个字符 -->
    <div 
      v-else 
      class="token-icon-fallback" 
      :style="fallbackStyle"
    >
      {{ fallbackText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  symbol: string
  size?: 'small' | 'medium' | 'large'
  customIconUrl?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium'
})

// State
const imageError = ref(false)

// Computed
const sizeClass = computed(() => {
  return `token-icon-${props.size}`
})

const iconUrl = computed(() => {
  if (imageError.value) return null
  
  // 如果提供了自定义图标URL，使用它
  if (props.customIconUrl) {
    return props.customIconUrl
  }
  
  // 内置图标映射
  const iconMap: Record<string, string> = {
    'WRMB': new URL('../../assets/wrmb.png', import.meta.url).href,
    'USDC': new URL('../../assets/usdc.png', import.meta.url).href,
    'USDT': new URL('../../assets/usdt.png', import.meta.url).href,
    'CINA': new URL('../../assets/cina.png', import.meta.url).href
  }
  
  return iconMap[props.symbol] || null
})

const fallbackText = computed(() => {
  return props.symbol.substring(0, 2).toUpperCase()
})

const fallbackStyle = computed(() => {
  // 根据symbol生成一致的背景色和文字色
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#009432', '#0652DD', '#9980FA'
  ]
  
  // 使用symbol的字符编码之和作为种子
  let hash = 0
  for (let i = 0; i < props.symbol.length; i++) {
    hash = props.symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const backgroundColor = colors[Math.abs(hash) % colors.length]
  
  // 计算对比色以确保文字可读性
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  const textColor = brightness > 128 ? '#000000' : '#FFFFFF'
  
  return {
    backgroundColor,
    color: textColor
  }
})

// Methods
const handleImageError = () => {
  imageError.value = true
}
</script>

<style scoped>
.token-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.token-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.token-icon-fallback {
  width: 100%;
  height: 100%;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border-radius: 50%;
}

/* Size variants */
.token-icon-small {
  width: 16px;
  height: 16px;
}

.token-icon-small .token-icon-fallback {
  font-size: 8px;
}

.token-icon-medium {
  width: 20px;
  height: 20px;
}

.token-icon-medium .token-icon-fallback {
  font-size: 10px;
}

.token-icon-large {
  width: 32px;
  height: 32px;
}

.token-icon-large .token-icon-fallback {
  font-size: 14px;
}
</style>