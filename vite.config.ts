import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'tcplayer/*'],
      manifest: {
        name: '刘费曼的数学课',
        short_name: '数学课',
        description: '费曼老师的数学视频课程',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/feiman-manim/',
        scope: '/feiman-manim/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            // 封面图永久缓存
            urlPattern: /^https:\/\/.*\.aliyuncs\.com\/.*\.(png|jpg|jpeg|webp)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-images',
              expiration: {
                maxEntries: 200,
              },
            },
          },
          {
            // 阿里云播放器资源永久缓存
            urlPattern: /^https:\/\/.*\.aliyuncs\.com\/.*\.(js|css|woff2)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'player-assets',
              expiration: {
                maxEntries: 50,
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/feiman-manim/',
})