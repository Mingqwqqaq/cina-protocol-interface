import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver({ importStyle: false })],
      imports: [
        'vue',
        'vue-router',
        'pinia',
        {
          'ethers': ['ethers', 'Contract', 'BrowserProvider', 'formatUnits', 'parseUnits']
        }
      ],
      dts: true
    }),
    Components({
      resolvers: [ElementPlusResolver({ importStyle: false })]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false
  },
  server: {
    allowedHosts: ['wrmb-dapp.dev.isecsp.cn', 'wrmb-v1.dev.isecsp.cn', 'wrmb-v2.dev.isecsp.cn', 'cina-bate1.dev.isecsp.cn', 'cina-bate.dev.isecsp.cn'],
    host: '0.0.0.0',
    port: 3100,
  },
  build: {
    target: 'esnext',
    sourcemap: true
  }
})