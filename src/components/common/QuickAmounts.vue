<template>
  <div class="quick-amounts">
    <el-button class="btn-quick-amount" v-for="percentage in percentages" :key="percentage" link :size="size"
      @click="$emit('select-percentage', percentage)">
      {{ percentage }}%
    </el-button>
    <el-button class="btn-quick-amount" v-if="showMax" link :size="size" @click="$emit('select-max')">
      {{ maxLabel }}
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { withDefaults, defineProps } from 'vue'

interface Props {
  percentages?: number[]
  showMax?: boolean
  maxLabel?: string
  size?: 'large' | 'default' | 'small'
}

withDefaults(defineProps<Props>(), {
  percentages: () => [25, 50, 75],
  showMax: true,
  maxLabel: 'MAX',
  size: 'small',
  type: 'text'
})
</script>

<style scoped>
.quick-amounts {
  display: flex;
  gap: 8px;
}

.btn-quick-amount {
  width: 42px;
}
</style>