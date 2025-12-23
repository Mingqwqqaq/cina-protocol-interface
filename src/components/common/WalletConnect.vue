<template>
  <div class="wallet-connect">
    <!-- Connected State -->
    <div v-if="walletStore.isConnected" class="flex items-center space-x-3 w-24">
      <!-- Account Dropdown -->
      <el-dropdown @command="handleAccountAction" trigger="click">
        <el-button link>
          <div class="flex items-center space-x-2">
            <div class="md:hidden rounded-full flex items-center justify-center">
              <span class="text-xs font-bold">
                {{ walletStore.shortAddress }}
              </span>
            </div>
            <span class="hidden sm:inline text-sm font-medium">
              {{ walletStore.shortAddress }}
            </span>
          </div>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="copy">
              <el-icon>
                <DocumentCopy />
              </el-icon>
              {{ $t('wallet.copyAddress') }}
            </el-dropdown-item>
            <el-dropdown-item command="switchNetwork">
              <el-icon>
                <Connection />
              </el-icon>
              {{ $t('wallet.switchNetwork') }}
            </el-dropdown-item>
            <el-dropdown-item command="showWallet">
              <el-icon>
                <Wallet />
              </el-icon>
              {{ $t('wallet.showWallet') }}
            </el-dropdown-item>
            <el-dropdown-item command="explorer">
              <el-icon>
                <Link />
              </el-icon>
              {{ $t('wallet.viewOnExplorer') }}
            </el-dropdown-item>
            <el-dropdown-item divided command="disconnect">
              <el-icon>
                <SwitchButton />
              </el-icon>
              {{ $t('wallet.disconnect') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div v-else class="w-24">
      <!-- Disconnected State -->
      <el-button type="primary" @click="handleConnectWallet" :loading="walletStore.isConnecting" class="connect-button">
        {{ $t('wallet.connect') }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Wallet,
  DocumentCopy,
  Link,
  SwitchButton,
  Connection,
} from '@element-plus/icons-vue'

import { useWalletStore } from '@/stores/wallet'
import { useAppKit } from '@reown/appkit/vue'

const { t } = useI18n()
const walletStore = useWalletStore()

const { open } = useAppKit();
const handleConnectWallet = async () => {
  await open();
}

// Handle account dropdown actions
const handleAccountAction = async (command: string) => {
  switch (command) {
    case 'copy':
      try {
        await navigator.clipboard.writeText(walletStore.address)
        ElMessage.success(t('wallet.addressCopied'))
      } catch (error) {
        console.error('Failed to copy address:', error)
        ElMessage.error(t('wallet.copyFailed'))
      }
      break

    case 'explorer':
      const explorerUrl = walletStore.currentNetwork?.blockExplorer
      if (explorerUrl) {
        window.open(`${explorerUrl}/address/${walletStore.address}`, '_blank')
      }
      break

    case 'switchNetwork':
      await open({ view: 'Networks' })
      break

    case 'showWallet':
      await open()
      break

    case 'disconnect':
      try {
        await ElMessageBox.confirm(
          t('wallet.confirmDisconnect'),
          t('wallet.disconnect'),
          {
            confirmButtonText: t('common.confirm'),
            cancelButtonText: t('common.cancel'),
            type: 'warning'
          }
        )
        await walletStore.disconnectWallet()
      } catch (error) {
        // User cancelled
      }
      break
  }
}

// Cleanup on unmount
onUnmounted(() => {

})
</script>

<style scoped>
.wallet-connect {
  @apply flex items-center;
}

:deep(.el-dropdown-menu__item) {
  @apply flex items-center space-x-2;
}

:deep(.el-dropdown-menu__item .el-icon) {
  @apply text-gray-500;
}

:deep(.el-dialog__body) {
  @apply pt-0;
}

.network-option {
  @apply transition-all duration-200;
}

.network-option:hover {
  @apply transform scale-[1.02];
}

.network-option.current-network {
  @apply ring-2 ring-primary-500 ring-opacity-50;
}

@media (max-width: 640px) {
  .connect-button {
    @apply px-4 py-2 text-sm;
  }

  .account-button {
    @apply px-2 py-1.5;
  }
}
</style>