<template>
  <div class="info-grid">
    <div v-for="(card, index) in cards" :key="index" class="info-card">
      <div class="info-header">
        <el-icon class="info-icon">
          <component :is="card.icon" />
        </el-icon>
        <h3 class="info-title">{{ card.title }}</h3>
      </div>
      <p class="info-content">
        {{ card.content }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

// 定义卡片数据类型
interface InfoCard {
  icon: Component
  title: string
  content: string
}

// 定义props
defineProps<{
  cards: InfoCard[]
}>()
</script>

<style scoped>
.info-grid {
  @apply grid grid-cols-1 gap-6 mb-6 mt-6;
}

.info-card {
  @apply rounded-xl p-6;
  background-color: var(--card-bg);
}

.info-header {
  @apply flex items-center space-x-3 mb-4;
}

.info-icon {
  @apply text-2xl;
  color: var(--primary-color);
}

.info-title {
  @apply text-lg font-semibold;
  color: var(--text-primary);
}

.info-content {
  @apply text-sm leading-relaxed;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .info-grid {
    @apply grid-cols-1 gap-4 mb-6;
  }
}
</style>