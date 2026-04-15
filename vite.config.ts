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
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // 缓存阿里云点播视频文件（mp4），看过的视频离线可播放
            urlPattern: /^https:\/\/outin-[^/]+\.oss-cn-shanghai\.aliyuncs\.com\/.*\.mp4/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cached-videos',
              plugins: [
                {
                  // 去掉签名参数，用纯 URL 做缓存 key
                  cacheKeyWillBeUsed: async ({ request }) => {
                    const url = new URL(request.url);
                    // 只保留路径，去掉 ?Expires=&Signature= 等签名参数
                    const cleanUrl = url.origin + url.pathname;
                    return cleanUrl;
                  },
                },
              ],
              // 缓存有效期 7 天，超过后下次在线时重新验证
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.aliyuncs\.com\/.*\.(png|jpg|jpeg|webp)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-images',
            },
          },
          {
            urlPattern: /^https:\/\/.*\.aliyuncs\.com\/.*\.(js|css|woff2)/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'player-assets',
            },
          },
        ],
      },
    }),
  ],
  base: '/feiman-manim/',
})