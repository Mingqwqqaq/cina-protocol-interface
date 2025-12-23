<template>
  <div class="token-select-container">
    <!-- 触发按钮：展示当前选择或占位 -->
    <div class="token-symbol-btn" @click="openDialog">
      <span v-if="modelValue" class="token-symbol-selected">
        <TokenIcon :symbol="modelValue.symbol" size="medium" />
        <span class="token-symbol-text">{{ modelValue.symbol }}</span>
      </span>
      <span v-else>
        {{ placeholder || $t('common.select') }}
      </span>
      <el-icon><arrow-down /></el-icon>
    </div>

    <!-- 选择模态框 -->
    <el-dialog v-model="dialogVisible" :title="placeholder || $t('common.select')" :width="dialogWidth"
      :append-to-body="true" destroy-on-close>
      <div class="token-dialog-body">
        <!-- 全量列表 -->
        <div class="list-section">
          <el-empty v-if="!tokens.length" :description="$t('tokenSelector.noAvailableTokens')" />
          <el-scrollbar v-else height="300px">
            <div v-for="token in tokens" :key="token.address" class="token-row" @click="selectToken(token)">
              <div class="token-main">
                <TokenIcon :symbol="token.symbol" size="medium" />
                <div class="token-info">
                  <div class="token-symbol">{{ token.symbol }}</div>
                  <div class="token-name">{{ token.name }}</div>
                </div>
              </div>
              <div class="token-extra" v-if="token.balance">
                <div class="token-balance">{{ $t('common.balance') }}: {{ token.balance }}</div>
              </div>
            </div>
          </el-scrollbar>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">{{ $t('common.cancel') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDown } from '@element-plus/icons-vue'
import TokenIcon from './common/TokenIcon.vue'

interface Token {
  symbol: string
  name: string
  address: string
  decimals: number
  balance?: number
}

interface Props {
  modelValue?: Token
  tokens: Token[]
  placeholder?: string
}

interface Emits {
  'update:modelValue': [value: Token]
  'tokenChange': [value: Token, oldValue: Token | undefined]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

// State
const dialogVisible = ref(false)
const windowWidth = ref(window.innerWidth)

// Computed
const dialogWidth = computed(() => {
  return windowWidth.value < 640 ? '95%' : '420px'
})

// Methods
const openDialog = () => {
  dialogVisible.value = true
}

const selectToken = (token: Token) => {
  const oldValue = props.modelValue
  emit('update:modelValue', token)
  emit('tokenChange', token, oldValue)
  dialogVisible.value = false
}



// Handle window resize for responsive dialog
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
}

// Lifecycle
import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})
</script>

<style scoped>
.token-select-container {
  width: 100%;
}

.token-dialog-body {
  padding: 0;
}

.token-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  transition: background-color 0.15s ease;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.token-row:hover {
  background-color: var(--el-fill-color-light);
}

.token-row:last-child {
  border-bottom: none;
}

.token-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.token-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.token-symbol {
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.token-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.token-extra {
  flex-shrink: 0;
  margin-left: 8px;
}

.token-balance {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* Responsive styles */
@media (max-width: 768px) {
  .token-select-trigger {
    font-size: 13px;
    padding: 6px 10px;
    min-height: 36px;
  }

  .token-icon {
    width: 18px;
    height: 18px;
  }

  .token-row {
    padding: 10px 12px;
  }

  .token-symbol {
    font-size: 13px;
  }

  .token-name {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .token-select-trigger {
    font-size: 12px;
    padding: 4px 8px;
    min-height: 32px;
  }

  .token-icon {
    width: 16px;
    height: 16px;
  }

  .token-row {
    padding: 8px 10px;
  }

  .token-symbol {
    font-size: 12px;
  }

  .token-name {
    font-size: 10px;
  }

  .token-balance {
    font-size: 11px;
  }
}

/* Touch-friendly improvements */
@media (hover: none) and (pointer: coarse) {
  .token-row {
    min-height: 44px;
    padding: 12px 16px;
  }
}

/* Dialog responsive styles */
:deep(.el-dialog) {
  width: 420px !important;
  max-width: 95vw !important;
  margin: 10px auto !important;
  border-radius: 12px;
}

@media (max-width: 768px) {
  :deep(.el-dialog) {
    width: 95vw !important;
    margin: 20px auto !important;
    border-radius: 8px;
  }

  :deep(.el-dialog__body) {
    padding: 16px;
  }
}

@media (max-width: 480px) {
  :deep(.el-dialog) {
    width: 100vw !important;
    margin: 0 !important;
    border-radius: 0;
    max-height: 100vh;
  }

  :deep(.el-dialog__body) {
    padding: 12px;
  }
}

/* Ensure proper scrolling on mobile */
:deep(.el-scrollbar__wrap) {
  -webkit-overflow-scrolling: touch;
}
</style>