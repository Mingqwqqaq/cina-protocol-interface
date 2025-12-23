<template>
  <div class="pull-to-refresh-container">
    <!-- 下拉刷新指示器 -->
    <div v-if="isPulling || isRefreshing" class="pull-indicator" :style="{
      opacity: Math.min(pullDistance / 60, 1),
      transform: `translateX(-50%) scale(${Math.min(pullDistance / 60, 1)})`
    }">
      <div class="indicator-content">
        <div v-if="!isRefreshing" class="pull-icon" :class="{ 'can-refresh': canRefresh }">
          <svg class="refresh-arrow" :class="{ 'rotate-180': canRefresh }" width="32" height="32" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
        </div>
        <div v-else class="loading-spinner">
          <svg class="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        </div>
        <!-- 隐藏文案显示 -->
        <!-- <div class="indicator-text">
          <span v-if="!isRefreshing && !canRefresh">{{ $t('common.pullToRefresh') }}</span>
          <span v-else-if="!isRefreshing && canRefresh">{{ $t('common.releaseToRefresh') }}</span>
          <span v-else>{{ $t('common.refreshing') }}</span>
        </div> -->
      </div>
    </div>

    <!-- 页面内容 -->
    <div class="ptr-template-page">
      <div class="ptr-template-page-content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isPulling: boolean
  isRefreshing: boolean
  pullDistance: number
  canRefresh: boolean
}

defineProps<Props>()
</script>

<style scoped>
.pull-to-refresh-container {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pull-indicator {
  position: fixed;
  top: calc(20px + 2rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease-out;
}

@media (prefers-color-scheme: dark) {
  .pull-indicator {
    background-color: rgba(31, 41, 55, 0.95);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

.dark .pull-indicator {
  background-color: rgba(31, 41, 55, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.indicator-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #6b7280;
}

@media (prefers-color-scheme: dark) {
  .indicator-content {
    color: #9ca3af;
  }
}

.dark .indicator-content {
  color: #9ca3af;
}

.pull-icon {
  transition: all 0.3s ease-out;
  color: #9ca3af;
}

.pull-icon.can-refresh {
  color: #3b82f6;
  transform: scale(1.1);
}

@media (prefers-color-scheme: dark) {
  .pull-icon {
    color: #6b7280;
  }

  .pull-icon.can-refresh {
    color: #60a5fa;
  }
}

.dark .pull-icon {
  color: #6b7280;
}

.dark .pull-icon.can-refresh {
  color: #60a5fa;
}

.refresh-arrow {
  transition: transform 0.3s ease-out;
}

.refresh-arrow.rotate-180 {
  transform: rotate(180deg);
}

.loading-spinner {
  color: #3b82f6;
}

@media (prefers-color-scheme: dark) {
  .loading-spinner {
    color: #60a5fa;
  }
}

.dark .loading-spinner {
  color: #60a5fa;
}

.indicator-text {
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  transition: color 0.3s;
  white-space: nowrap;
}

.content-wrapper {
  position: relative;
  z-index: 10;
  flex: 1;
  overflow: hidden;
}

/* Dashboard 样式 */
.ptr-template-page {
  background-color: var(--bg-secondary);
}

.ptr-template-page-content {
  @apply max-w-6xl mx-auto px-4 md:px-8 lg:px-16 py-4 md:py-6 lg:py-8;
  min-height: calc(100vh - 4rem);
}

/* 动画 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .pull-indicator {
    width: 50px;
    height: 50px;
    top: calc(15px + 2rem);
  }

  .indicator-content {
    gap: 2px;
  }

  .indicator-text {
    font-size: 8px;
  }

  .pull-icon svg,
  .loading-spinner svg {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 768px) {
  .ptr-template-page {
    @apply h-full;
    border-radius: 1rem 1rem 0 0;
    margin: 2rem 1.5rem 0 1.5rem;
  }

  .ptr-template-page-content {
    @apply px-4 py-6 h-full overflow-y-auto;
    /* 使用矩形遮罩 */
    /* clip-path: inset(1rem 0 0 0);
    -webkit-clip-path: inset(1rem 0 0 0); */
    /* 隐藏滚动条 */
    scrollbar-width: none;
    /* Firefox */
    -ms-overflow-style: none;
    /* IE and Edge */
  }

  .ptr-template-page-content::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari and Opera */
  }
}
</style>