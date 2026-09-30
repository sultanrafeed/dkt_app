import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base './' + hash routing lets the build run from any folder, GitHub Pages,
// or inside a Capacitor native shell.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'NSW DKT Trainer',
        short_name: 'DKT Trainer',
        description: 'Study system for the NSW Driver Knowledge Test (Class C car licence).',
        theme_color: '#0b5cad',
        background_color: '#f6f7f9',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell, question bank, handbook text and every question image are
        // precached, so all practice works offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,png,json}', 'img/q/*.webp'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // Handbook page scans are cached as they are viewed (or all at once
            // from Settings → Offline).
            urlPattern: ({ url }) => url.pathname.includes('/img/hb/'),
            handler: 'CacheFirst',
            options: { cacheName: 'handbook-pages', expiration: { maxEntries: 260 } },
          },
        ],
      },
    }),
  ],
})
