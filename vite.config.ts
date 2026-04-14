import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  base: '/feiman-manim/',
  server: {
    proxy: {
      '/api/psign': {
        target: 'http://localhost:3100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/psign/, ''),
      },
    },
  },
})