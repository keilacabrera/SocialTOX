import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  server: {
    proxy: {
      '/api': {
        // Aseguramos que apunte exactamente a tu backend activo
        target: 'http://127.0.0.1:8000', 
        changeOrigin: true,
        // Comentamos esta línea para que NO borre la palabra /api
        // rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
