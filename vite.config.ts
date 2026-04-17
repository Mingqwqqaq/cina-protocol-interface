import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    allowedHosts: [
      'wrmb-dapp.dev.isecsp.cn',
      'wrmb-v1.dev.isecsp.cn',
      'wrmb-v2.dev.isecsp.cn',
      'cina-bate1.dev.isecsp.cn',
      'cina-bate.dev.isecsp.cn'
    ],
    host: '0.0.0.0',
    port: 3100
  },
  build: {
    target: 'esnext',
    sourcemap: true
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: './src/test/setup.ts'
  }
})
