<template>
  <el-dialog :model-value="visible" @update:model-value="$emit('update:visible', $event)" :title="modalTitle"
    :width="dialogWidth" :close-on-click-modal="false" :close-on-press-escape="canClose" :show-close="canClose"
    @close="handleClose">
    <div class="transaction-modal">
      <!-- Transaction Steps -->
      <div class="steps-container mb-6">
        <div class="flex justify-between">
          <div v-for="(step, index) in steps" :key="index" class="step-item" :class="{
            'active': currentStep === index,
            'completed': currentStep > index,
            'pending': currentStep < index
          }">
            <div class="step-circle">
              <el-icon v-if="currentStep > index" class="text-white">
                <Check />
              </el-icon>
              <el-icon v-else-if="currentStep === index && (status === 'loading' || status === 'pending')"
                class="text-white animate-spin">
                <Loading />
              </el-icon>
              <span v-else class="text-sm font-medium">{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>

        <!-- Progress Line -->
        <div class="progress-line" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0"
          aria-valuemax="100">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
      </div>

      <!-- Transaction Details -->
      <div v-if="transactionHash" class="transaction-details mb-6">
        <div class="detail-card">
          <h4 class="flex items-center justify-between">
            <span class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('transaction.hash') }}</span>
            <div class="flex items-center space-x-2">
              <el-button text size="small" @click="copyTransactionHash">
                <el-icon>
                  <DocumentCopy />
                </el-icon>
              </el-button>
              <el-button text size="small" @click="viewOnExplorer">
                <el-icon>
                  <Link />
                </el-icon>
              </el-button>
            </div>
          </h4>

          <div class="mt-2">
            <span class="text-xs text-gray-600 dark:text-gray-400 break-all">
              {{ transactionHash }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="transaction-details mb-6">
        <div class="detail-card">
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ $t('transaction.details') }}
          </h4>

          <div class="space-y-3">
            <div v-for="detail in transactionDetails" :key="detail.label" class="detail-row">
              <span class="detail-label">{{ detail.label }}</span>
              <div class="flex flex-col">
                <div v-for="(item, index) in detail.values" :key="index" class="detail-value" :class="[
                  detail.highlight ? 'text-primary-600 dark:text-primary-400 font-semibold' : '',
                  detail.type === 'debit' ? 'circle-bg-red' : '',
                  detail.type === 'credit' ? 'circle-bg-green' : ''
                ]">
                  {{ item }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Optional Gas Info -->
      <!-- <div v-if="gasInfo" class="mb-6">
        <div class="detail-card">
          <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gas Info</h4>
          <div class="space-y-3">
            <div class="detail-row"><span class="detail-label">Gas Limit</span><span class="detail-value">{{ gasInfo.gasLimit }}</span></div>
            <div class="detail-row"><span class="detail-label">Gas Price</span><span class="detail-value">{{ gasInfo.gasPrice }}</span></div>
            <div class="detail-row"><span class="detail-label">Estimated Fee</span><span class="detail-value">{{ gasInfo.estimatedFee }}</span></div>
            <div class="detail-row"><span class="detail-label">Max Fee</span><span class="detail-value">{{ gasInfo.maxFee }}</span></div>
          </div>
        </div>
      </div> -->

      <!-- Status Messages -->
      <div class="status-section mb-6">
        <div v-if="status === 'pending'" class="status-message info">
          <el-icon>
            <InfoFilled />
          </el-icon>
          <span>{{ $t('transaction.confirmInWallet') }}</span>
        </div>

        <div v-else-if="status === 'loading'" class="status-message loading">
          <el-icon class="animate-spin">
            <Loading />
          </el-icon>
          <span>{{ currentStepMessage }}</span>
        </div>
      </div>
    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex justify-end space-x-3">
        <el-button v-if="canClose" @click="handleClose">
          {{ status === 'success' ? $t('common.close') : $t('common.cancel') }}
        </el-button>

        <el-button v-if="status === 'error'" type="primary" @click="handleRetry">
          {{ $t('common.retry') }}
        </el-button>

        <el-button v-if="status === 'success' && showViewTransaction" type="primary" @click="viewOnExplorer">
          {{ $t('transaction.viewOnExplorer') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  Check,
  Loading,
  InfoFilled,
  DocumentCopy,
  Link
} from '@element-plus/icons-vue'

import { useWalletStore } from '@/stores/wallet'

interface TransactionStep {
  label: string
  description?: string
}

interface TransactionDetail {
  label: string
  values: string[]
  highlight?: boolean
  type?: 'debit' | 'credit'
}

interface GasInfo {
  gasLimit: string
  gasPrice: string
  estimatedFee: string
  maxFee: string
}

interface Props {
  visible: boolean
  title?: string
  steps: TransactionStep[]
  currentStep: number
  status: 'pending' | 'loading' | 'success' | 'error'
  transactionDetails: TransactionDetail[]
  gasInfo?: GasInfo
  transactionHash?: string
  errorMessage?: string
  showViewTransaction?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
  (e: 'retry'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showViewTransaction: true
})

const emit = defineEmits<Emits>()

const { t } = useI18n()
const walletStore = useWalletStore()

const isMobile = ref(false)
const windowWidth = ref(window.innerWidth)

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
  isMobile.value = windowWidth.value < 640
}

onMounted(() => {
  updateWindowWidth()
  window.addEventListener('resize', updateWindowWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

const dialogWidth = computed(() => {
  return isMobile.value ? '95%' : '500px'
})

const modalTitle = computed(() => {
  return props.title || t('transaction.title')
})

const canClose = computed(() => {
  return props.status !== 'loading'
})

const currentStepMessage = computed(() => {
  const step = props.steps[props.currentStep]
  return step?.description || step?.label || ''
})

const progressPercent = computed(() => {
  if (!props.steps?.length) return 0
  if (props.steps.length === 1) return 100
  const denom = props.steps.length - 1
  const val = (props.currentStep / denom) * 100
  return Math.max(0, Math.min(100, Math.round(val)))
})

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleRetry = () => {
  emit('retry')
}

const copyTransactionHash = async () => {
  if (!props.transactionHash) return

  try {
    await navigator.clipboard.writeText(props.transactionHash)
    ElMessage.success(t('transaction.hashCopied'))
  } catch (error) {
    console.error('Failed to copy transaction hash:', error)
    ElMessage.error(t('transaction.copyFailed'))
  }
}

const viewOnExplorer = () => {
  if (!props.transactionHash) return

  const explorerUrl = walletStore.currentNetwork?.blockExplorer
  if (explorerUrl) {
    window.open(`${explorerUrl}/tx/${props.transactionHash}`, '_blank')
  }
}

const showErrorDetails = ref(false)

const copyErrorMessage = async () => {
  if (!props.errorMessage) return
  try {
    await navigator.clipboard.writeText(props.errorMessage)
    ElMessage.success('Copied')
  } catch (e) {
    ElMessage.error('Copy failed')
  }
}

// Auto-close on success after delay
watch(
  () => props.status,
  (newStatus) => {
    if (newStatus === 'success') {
      setTimeout(() => {
        if (props.visible) {
          handleClose()
        }
      }, 3000)
    }
  }
)
</script>

<style scoped>
.transaction-modal {
  @apply max-h-[75vh] overflow-y-auto;
}

.steps-container {
  @apply relative;
}

.step-item {
  @apply flex flex-col items-center space-y-2 relative z-10;
  flex: 1;
}

.step-circle {
  @apply w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300;
}

.step-item.pending .step-circle {
  @apply bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400;
}

.step-item.active .step-circle {
  background-color: var(--primary-color);
  @apply text-white;
}

.step-item.completed .step-circle {
  background-color: var(--success-color);
  @apply text-white;
}

.step-label {
  @apply text-xs text-center text-gray-600 dark:text-gray-400 max-w-20;
}

.step-item.active .step-label {
  color: var(--primary-color);
  @apply font-medium;
}

.step-item.completed .step-label {
  @apply text-green-600 dark:text-green-400;
}

.progress-line {
  @apply absolute top-4 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700;
}

.progress-fill {
  background-color: var(--primary-color);
  @apply h-full transition-all duration-500 ease-out;
}

.detail-card {
  background-color: var(--bg-secondary);
  @apply p-4 rounded-lg;
}

.detail-row {
  @apply flex items-center justify-between;
}

.detail-label {
  @apply text-sm text-gray-600 dark:text-gray-400;
}

.detail-value {
  @apply text-sm font-medium text-gray-900 dark:text-white text-right mb-2;
  word-break: break-word;
}

.circle-bg-green {
  @apply bg-green-100 dark:bg-green-600/30 text-green-600 dark:text-green-300 px-3 py-1 rounded-full inline-block;
  width: fit-content;
}

.circle-bg-red {
  @apply bg-red-100 dark:bg-red-600/30 text-red-600 dark:text-red-300 px-3 py-1 rounded-full inline-block;
  width: fit-content;
}

.status-message {
  @apply flex items-center space-x-3 p-3 rounded-lg;
}

.status-message.info {
  color: var(--primary-color);
  @apply bg-blue-50 dark:bg-blue-900/20;
}

.status-message.loading {
  color: var(--primary-color);
  @apply bg-primary-50 dark:bg-primary-900/20;
}

.status-message.success {
  @apply bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300;
}

.status-message.error {
  @apply bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300;
}

.error-message-container {
  @apply overflow-x-auto;
  max-width: calc(100% - 2rem);
  scrollbar-width: thin;
}

.error-message-container::-webkit-scrollbar {
  height: 4px;
}

.error-message-container::-webkit-scrollbar-track {
  @apply bg-transparent;
}

.error-message-container::-webkit-scrollbar-thumb {
  @apply bg-gray-300 dark:bg-gray-600 rounded-full;
}

:deep(.el-dialog__body) {
  @apply pt-4;
}

:deep(.el-dialog__footer) {
  @apply pt-4 border-t border-gray-200 dark:border-gray-700;
}

@media (max-width: 640px) {
  .transaction-modal {
    @apply max-h-[70vh];
  }

  .step-circle {
    @apply w-6 h-6;
  }

  .step-label {
    @apply text-xs max-w-16;
  }

  .progress-line {
    @apply top-3;
  }

  .detail-row {
    @apply flex-col items-start space-y-1;
  }

  .detail-value {
    @apply text-left;
  }

  .status-message {
    @apply p-2;
  }

  :deep(.el-dialog__header) {
    @apply py-3 px-4;
  }

  :deep(.el-dialog__body) {
    @apply px-4 py-3;
  }

  :deep(.el-dialog__footer) {
    @apply py-3 px-4;
  }

  :deep(.el-button) {
    @apply text-sm py-1 px-2;
  }
}
</style>