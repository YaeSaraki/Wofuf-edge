import {fileURLToPath, URL} from 'node:url'

import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/views': fileURLToPath(new URL('./src/**/views', import.meta.url)),
      '@/components': fileURLToPath(new URL('./src/**/components', import.meta.url)),
      '@M': fileURLToPath(new URL('./src/modules', import.meta.url)),
      '@S': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@SU': fileURLToPath(new URL('./src/shared/utils', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    // 本地开发把 /api 代理到本地跑着的 Worker（npx wrangler dev，默认 8787 端口）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
})
