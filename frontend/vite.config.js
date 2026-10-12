import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: false,
      },
      '/media': {
        target: 'http://backend:8000',
        changeOrigin: false,
      },
    },
  },
})
