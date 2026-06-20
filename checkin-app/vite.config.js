import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Served behind the same domain/port as the main app, under this path prefix
// (see Caddyfile: handle_path /checkin/*). Must match in nginx.conf too if changed.
const BASE_PATH = '/checkin/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      base: BASE_PATH,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'WeddingInvite Check-in',
        short_name: 'Check-in',
        description: 'Check-in des invités, en ligne ou hors-ligne',
        theme_color: '#df6746',
        background_color: '#fdf6f3',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE_PATH,
        scope: BASE_PATH,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // App shell only - guest data & check-ins are handled explicitly via IndexedDB,
        // never let the SW cache /api responses (they must always reflect live auth state).
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: []
      }
    })
  ],
  server: {
    port: 3001,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
