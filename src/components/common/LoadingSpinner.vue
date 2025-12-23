<template>
  <div class="loading-spinner" :class="containerClass">
    <!-- Spinner -->
    <div class="spinner" :class="spinnerClass">
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
    </div>
    
    <!-- Loading Text -->
    <div v-if="text" class="loading-text" :class="textClass">
      {{ text }}
    </div>
    
    <!-- Progress Bar -->
    <div v-if="showProgress && progress !== undefined" class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :style="{ width: `${Math.min(100, Math.max(0, progress))}%` }"
        ></div>
      </div>
      <div class="progress-text">
        {{ Math.round(progress) }}%
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'small' | 'medium' | 'large'
  text?: string
  overlay?: boolean
  progress?: number
  showProgress?: boolean
  color?: 'primary' | 'white' | 'gray'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  overlay: false,
  showProgress: false,
  color: 'primary'
})

const containerClass = computed(() => {
  const classes = []
  
  if (props.overlay) {
    classes.push('overlay')
  }
  
  return classes.join(' ')
})

const spinnerClass = computed(() => {
  const classes = []
  
  // Size classes
  switch (props.size) {
    case 'small':
      classes.push('spinner-small')
      break
    case 'large':
      classes.push('spinner-large')
      break
    default:
      classes.push('spinner-medium')
  }
  
  // Color classes
  switch (props.color) {
    case 'white':
      classes.push('spinner-white')
      break
    case 'gray':
      classes.push('spinner-gray')
      break
    default:
      classes.push('spinner-primary')
  }
  
  return classes.join(' ')
})

const textClass = computed(() => {
  const classes = ['mt-3']
  
  switch (props.size) {
    case 'small':
      classes.push('text-sm')
      break
    case 'large':
      classes.push('text-lg')
      break
    default:
      classes.push('text-base')
  }
  
  switch (props.color) {
    case 'white':
      classes.push('text-white')
      break
    case 'gray':
      classes.push('text-gray-600 dark:text-gray-400')
      break
    default:
      classes.push('text-gray-700 dark:text-gray-300')
  }
  
  return classes.join(' ')
})
</script>

<style scoped>
.loading-spinner {
  @apply flex flex-col items-center justify-center;
}

.loading-spinner.overlay {
  @apply fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50;
}

.spinner {
  @apply relative;
}

.spinner-small {
  @apply w-6 h-6;
}

.spinner-medium {
  @apply w-8 h-8;
}

.spinner-large {
  @apply w-12 h-12;
}

.spinner-ring {
  @apply absolute border-2 rounded-full animate-spin;
  border-top-color: transparent;
  border-right-color: transparent;
}

.spinner-small .spinner-ring {
  @apply w-6 h-6 border;
}

.spinner-medium .spinner-ring {
  @apply w-8 h-8 border-2;
}

.spinner-large .spinner-ring {
  @apply w-12 h-12 border-2;
}

.spinner-ring:nth-child(1) {
  animation-duration: 1.2s;
}

.spinner-ring:nth-child(2) {
  animation-duration: 1.2s;
  animation-delay: -0.1s;
  @apply scale-90;
}

.spinner-ring:nth-child(3) {
  animation-duration: 1.2s;
  animation-delay: -0.2s;
  @apply scale-75;
}

.spinner-ring:nth-child(4) {
  animation-duration: 1.2s;
  animation-delay: -0.3s;
  @apply scale-50;
}

/* Color variants */
.spinner-primary .spinner-ring {
  @apply border-primary-200 dark:border-primary-800;
  border-left-color: theme('colors.primary.500');
  border-bottom-color: theme('colors.primary.500');
}

.spinner-white .spinner-ring {
  @apply border-white/30;
  border-left-color: white;
  border-bottom-color: white;
}

.spinner-gray .spinner-ring {
  @apply border-gray-200 dark:border-gray-700;
  border-left-color: theme('colors.gray.500');
  border-bottom-color: theme('colors.gray.500');
}

.loading-text {
  @apply font-medium text-center;
}

.progress-container {
  @apply mt-4 w-full max-w-xs;
}

.progress-bar {
  @apply w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-primary-500 transition-all duration-300 ease-out;
}

.progress-text {
  @apply text-center text-sm text-gray-600 dark:text-gray-400 mt-2;
}

/* Animation keyframes */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Pulse animation for loading text */
.loading-text {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .loading-spinner.overlay {
    @apply px-4;
  }
  
  .progress-container {
    @apply max-w-full px-4;
  }
}
</style>