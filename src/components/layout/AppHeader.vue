<template>
  <header class="fixed top-0 left-0 right-0 z-50 shadow-sm border-b border-gray-200 dark:border-gray-700"
    style="background-color: var(--bg-secondary);">
    <div class="container">
      <div class="flex items-center justify-between h-16">
        <!-- Logo and Brand -->
        <div class="flex items-center space-x-4">
          <router-link to="/" class="flex items-center space-x-2">
            <!-- <div class="w-10 h-10 from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <img v-if="appStore.isDark" src="../../assets/logo-dark.png" alt="Logo" class="w-10 h-10 rounded-lg">
              <img v-else src="../../assets/logo.png" alt="Logo" class="w-10 h-10 rounded-lg">
            </div> -->
            <span class="text-lg font-bold" style="color: var(--primary-color);">CINA DOLLAR</span>
          </router-link>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-8">
          <template v-for="item in navigationItems" :key="item.name">
            <!-- 带有子菜单的导航项 -->
            <el-dropdown v-if="item.children" trigger="hover" class="nav-dropdown">
              <span
                class="nav-link cursor-pointer text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400">
                {{ $t(`navigation.${item.name}`) }}
                <el-icon class="ml-1">
                  <ArrowDown />
                </el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="child in item.children" :key="child.name">
                    <router-link :to="child.path" class="flex items-center w-full text-decoration-none" :class="{
                      'text-primary-600 dark:text-primary-400': $route.path === child.path,
                      'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400': $route.path !== child.path
                    }">
                      {{ $t(`navigation.${child.name}`) }}
                    </router-link>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <!-- 普通导航项 -->
            <router-link v-else :to="item.path" class="nav-link" :class="{
              'text-primary-600 dark:text-primary-400': $route.path === item.path,
              'text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400': $route.path !== item.path
            }">
              {{ $t(`navigation.${item.name}`) }}
            </router-link>
          </template>
        </nav>

        <!-- Right Side Actions -->
        <div class="flex items-center space-x-4">
          <!-- Theme Toggle -->
          <div class="flex items-center h-10">
            <el-button link @click="appStore.toggleTheme()">
              <el-icon>
                <Sunny v-if="appStore.isDark" />
                <Moon v-else />
              </el-icon>
            </el-button>
          </div>

          <!-- Language Toggle -->
          <div class="flex items-center h-10">
            <el-dropdown  class="nav-dropdown" @command="handleLanguageChange">
              <el-button link style="width: 20px;">
                {{ currentLanguage === 'en' ? 'En' : 'Zh' }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="en" :class="{ 'is-active': currentLanguage === 'en' }">
                    English
                  </el-dropdown-item>
                  <el-dropdown-item command="zh" :class="{ 'is-active': currentLanguage === 'zh' }">
                    中文
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- Wallet Connection -->
          <div class="flex items-center h-10">
            <WalletConnect />
          </div>

          <!-- Mobile Menu Toggle -->
          <div class="md:hidden flex items-center h-10">
            <el-button link style="color: var(--primary-color);" @click="mobileMenuOpen = !mobileMenuOpen">
              <el-icon>
                <Menu />
              </el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation -->
      <div v-show="mobileMenuOpen" class="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
        <nav class="flex flex-col space-y-2">
          <template v-for="item in navigationItems" :key="item.name">
            <!-- 带有子菜单的导航项 -->
            <div v-if="item.children" class="space-y-1">
              <div class="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                {{ $t(`navigation.${item.name}`) }}
              </div>
              <router-link v-for="child in item.children" :key="child.name" :to="child.path"
                class="flex items-center px-6 py-2 rounded-md text-sm font-medium transition-colors" :class="{
                  'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200': $route.path === child.path,
                  'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700': $route.path !== child.path
                }" @click="mobileMenuOpen = false">
                {{ $t(`navigation.${child.name}`) }}
              </router-link>
            </div>
            <!-- 普通导航项 -->
            <router-link v-else :to="item.path"
              class="flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors" :class="{
                'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200': $route.path === item.path,
                'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700': $route.path !== item.path
              }" @click="mobileMenuOpen = false">
              {{ $t(`navigation.${item.name}`) }}
            </router-link>
          </template>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import {
  Menu,
  Moon,
  Sunny,
  DataBoard,
  Wallet,
  Switch,
  TrendCharts,
  Document,
  Link,
  Box,
  Coin,
  Lock,
  ArrowDown
} from '@element-plus/icons-vue'

// Import custom icons
import WRMBIcon from '@/assets/wrmb.png'
import CINAIcon from '@/assets/cina.png'

import WalletConnect from '@/components/common/WalletConnect.vue'
import { useAppStore } from '@/stores/app'
import { useWalletStore } from '@/stores/wallet'

const { locale } = useI18n()
const appStore = useAppStore()
const walletStore = useWalletStore()
const route = useRoute()

const mobileMenuOpen = ref(false)

const currentLanguage = computed(() => locale.value)

const navigationItems = [
  {
    name: 'dashboard',
    path: '/'
  },
  {
    name: 'WRMB',
    children: [
      {
        name: 'swap',
        path: '/swap'
      },
      {
        name: 'savings',
        path: '/savings'
      },
      {
        name: 'wrap',
        path: '/wrap'
      }
    ]
  },
  {
    name: 'CINA',
    children: [
      {
        name: 'farm',
        path: '/farm'
      },
      {
        name: 'staking',
        path: '/staking'
      },
      {
        name: 'bonds',
        path: '/bonds'
      }
    ]
  },
  {
    name: 'status',
    path: '/status'
  }
]

const handleLanguageChange = (command: string) => {
  locale.value = command
  appStore.setLanguage(command)
}

// Close mobile menu when route changes
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>

<style scoped>
.container {
  @apply mx-auto max-w-6xl sm:px-6 lg:px-8;
}

.nav-link {
  @apply flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200;
}

@media (max-width: 640px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

.is-active {
  @apply bg-primary-50 text-primary-700;
}

.dark .is-active {
  @apply bg-primary-900 text-primary-200;
}

/* 取消子菜单导航项的hover描边 */
.nav-dropdown :deep(.el-dropdown__trigger) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.nav-dropdown :deep(.el-dropdown__trigger:hover),
.nav-dropdown :deep(.el-dropdown__trigger:focus),
.nav-dropdown :deep(.el-dropdown__trigger:active),
.nav-dropdown :deep(.el-dropdown__trigger:focus-visible) {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

/* 针对span元素的样式覆盖 */
.nav-dropdown span.nav-link:hover,
.nav-dropdown span.nav-link:focus,
.nav-dropdown span.nav-link:active {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
}
</style>