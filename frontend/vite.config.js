import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/events': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true
      },
      '/stats': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/alerts': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/simulate': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/ingestion': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/report': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/admin': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})
