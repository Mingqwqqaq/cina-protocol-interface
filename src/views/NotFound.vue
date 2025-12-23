<template>
  <div class="not-found">
    <div class="not-found-container">
      <div class="not-found-content">
        <!-- 404 Illustration -->
        <div class="illustration">
          <svg viewBox="0 0 400 300" class="w-full h-full">
            <!-- Background -->
            <rect width="400" height="300" fill="none" />

            <!-- 404 Text -->
            <text x="200" y="120" text-anchor="middle" class="error-text">
              404
            </text>

            <!-- Decorative Elements -->
            <circle cx="100" cy="80" r="20" class="decoration decoration-1" />
            <circle cx="320" cy="100" r="15" class="decoration decoration-2" />
            <circle cx="80" cy="200" r="12" class="decoration decoration-3" />
            <circle cx="350" cy="220" r="18" class="decoration decoration-1" />

            <!-- Floating Elements -->
            <rect x="60" y="150" width="30" height="30" rx="5" class="floating floating-1" />
            <rect x="300" y="160" width="25" height="25" rx="5" class="floating floating-2" />
            <rect x="150" y="200" width="20" height="20" rx="3" class="floating floating-3" />

            <!-- Connection Lines -->
            <path d="M100 80 L150 200" class="connection-line" />
            <path d="M320 100 L300 160" class="connection-line" />
            <path d="M350 220 L300 185" class="connection-line" />
          </svg>
        </div>

        <!-- Error Message -->
        <div class="error-message">
          <h1 class="error-title">
            {{ $t('error.pageNotFound') }}
          </h1>
          <p class="error-description">
            {{ $t('error.pageNotFoundDescription') }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <el-button type="primary" size="large" @click="goHome" class="home-button">
            <el-icon class="mr-2">
              <House />
            </el-icon>
            {{ $t('error.goHome') }}
          </el-button>

          <el-button size="large" @click="goBack" class="back-button">
            <el-icon class="mr-2">
              <ArrowLeft />
            </el-icon>
            {{ $t('error.goBack') }}
          </el-button>
        </div>

        <!-- Helpful Links -->
        <div class="helpful-links">
          <h3 class="links-title">
            {{ $t('error.helpfulLinks') }}
          </h3>
          <div class="links-grid">
            <router-link to="/" class="help-link">
              <el-icon>
                <DataBoard />
              </el-icon>
              <span>{{ $t('navigation.dashboard') }}</span>
            </router-link>

            <router-link to="/savings" class="help-link">
              <el-icon>
                <Wallet />
              </el-icon>
              <span>{{ $t('navigation.savings') }}</span>
            </router-link>

            <router-link to="/wrap" class="help-link">
              <el-icon>
                <Switch />
              </el-icon>
              <span>{{ $t('navigation.wrap') }}</span>
            </router-link>

            <router-link to="/bonds" class="help-link">
              <el-icon>
                <Document />
              </el-icon>
              <span>{{ $t('navigation.bonds') }}</span>
            </router-link>

            <router-link to="/portfolio" class="help-link">
              <el-icon>
                <TrendCharts />
              </el-icon>
              <span>{{ $t('navigation.portfolio') }}</span>
            </router-link>
          </div>
        </div>

        <!-- Search Suggestion -->
        <div class="search-section">
          <h3 class="search-title">
            {{ $t('error.searchSuggestion') }}
          </h3>
          <div class="search-input">
            <el-input v-model="searchQuery" :placeholder="$t('error.searchPlaceholder')" size="large"
              @keyup.enter="handleSearch">
              <template #suffix>
                <el-button text @click="handleSearch" :disabled="!searchQuery.trim()">
                  <el-icon>
                    <Search />
                  </el-icon>
                </el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import {
  House,
  ArrowLeft,
  DataBoard,
  Wallet,
  Switch,
  Document,
  TrendCharts,
  Search
} from '@element-plus/icons-vue'

const { t } = useI18n()
const router = useRouter()

const searchQuery = ref('')

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/')
  }
}

const handleSearch = () => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    ElMessage.warning(t('error.emptySearch'))
    return
  }

  // Simple search logic - redirect to relevant pages based on keywords
  if (query.includes('saving') || query.includes('vault') || query.includes('deposit')) {
    router.push('/savings')
  } else if (query.includes('wrap') || query.includes('unwrap') || query.includes('srmb')) {
    router.push('/wrap')
  } else if (query.includes('bond') || query.includes('pool') || query.includes('usdt')) {
    router.push('/bonds')
  } else if (query.includes('portfolio') || query.includes('holding') || query.includes('balance')) {
    router.push('/portfolio')
  } else if (query.includes('dashboard') || query.includes('overview') || query.includes('home')) {
    router.push('/')
  } else {
    ElMessage.info(t('error.noSearchResults'))
  }
}
</script>

<style scoped>
.not-found {
  @apply bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4;
}

.not-found-container {
  @apply max-w-4xl mx-auto;
}

.not-found-content {
  @apply text-center space-y-12;
}

.illustration {
  @apply w-full max-w-md mx-auto h-64;
}

.error-text {
  @apply fill-primary-500 dark:fill-primary-400;
  font-size: 72px;
  font-weight: bold;
  font-family: 'Inter', sans-serif;
}

.decoration {
  @apply opacity-60;
  animation: float 3s ease-in-out infinite;
}

.decoration-1 {
  @apply fill-primary-300 dark:fill-primary-600;
  animation-delay: 0s;
}

.decoration-2 {
  @apply fill-green-300 dark:fill-green-600;
  animation-delay: 1s;
}

.decoration-3 {
  @apply fill-yellow-300 dark:fill-yellow-600;
  animation-delay: 2s;
}

.floating {
  @apply fill-gray-300 dark:fill-gray-600 opacity-40;
  animation: float 4s ease-in-out infinite;
}

.floating-1 {
  animation-delay: 0.5s;
}

.floating-2 {
  animation-delay: 1.5s;
}

.floating-3 {
  animation-delay: 2.5s;
}

.connection-line {
  @apply stroke-gray-300 dark:stroke-gray-600 opacity-30;
  stroke-width: 2;
  stroke-dasharray: 5, 5;
  animation: dash 2s linear infinite;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-10px);
  }
}

@keyframes dash {
  to {
    stroke-dashoffset: -10;
  }
}

.error-message {
  @apply space-y-4;
}

.error-title {
  @apply text-4xl md:text-5xl font-bold text-gray-900 dark:text-white;
}

.error-description {
  @apply text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed;
}

.action-buttons {
  @apply flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6;
}

.home-button {
  @apply px-8 py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-lg;
}

.back-button {
  @apply px-8 py-3 rounded-lg font-medium transition-all duration-200 hover:shadow-md;
}

.helpful-links {
  @apply bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8;
}

.links-title {
  @apply text-xl font-semibold text-gray-900 dark:text-white mb-6;
}

.links-grid {
  @apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4;
}

.help-link {
  @apply flex flex-col items-center space-y-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200;
}

.help-link:hover {
  @apply transform -translate-y-1 shadow-md;
}

.help-link .el-icon {
  @apply text-2xl text-primary-500 dark:text-primary-400;
}

.help-link span {
  @apply text-sm font-medium text-gray-700 dark:text-gray-300;
}

.search-section {
  @apply bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8;
}

.search-title {
  @apply text-xl font-semibold text-gray-900 dark:text-white mb-6;
}

.search-input {
  @apply max-w-md mx-auto;
}

/* Responsive Design */
@media (max-width: 640px) {
  .not-found {
    @apply px-4 py-8;
  }

  .not-found-content {
    @apply space-y-8;
  }

  .illustration {
    @apply h-48;
  }

  .error-text {
    font-size: 48px;
  }

  .error-title {
    @apply text-3xl;
  }

  .error-description {
    @apply text-base;
  }

  .helpful-links {
    @apply p-6;
  }

  .links-grid {
    @apply grid-cols-2 gap-3;
  }

  .help-link {
    @apply p-3;
  }

  .help-link .el-icon {
    @apply text-xl;
  }

  .help-link span {
    @apply text-xs;
  }

  .search-section {
    @apply p-6;
  }
}

/* Dark mode specific adjustments */
@media (prefers-color-scheme: dark) {
  .error-text {
    filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.3));
  }
}

/* Animation for page entrance */
.not-found-content {
  animation: fadeInUp 0.6s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Hover effects for interactive elements */
.action-buttons .el-button {
  @apply transition-all duration-300;
}

.action-buttons .el-button:hover {
  @apply transform -translate-y-1;
}

/* Focus states for accessibility */
.help-link:focus {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800;
}

.search-input .el-input:focus-within {
  @apply ring-2 ring-primary-500;
}
</style>