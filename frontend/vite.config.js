import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appName = 'Anubhav Medical Billing';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icon.svg'],
      devOptions: {
        enabled: true,
        type: 'module' // keeps HMR working while serving the SW in dev
      },
      manifest: {
        name: appName,
        short_name: 'Billing',
        description: 'Installable PWA for Anubhav Medical Billing PDF generator.',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Never cache authenticated API calls.
            urlPattern: /^https?:\/\/.+\/api\/.*/,
            handler: 'NetworkOnly',
            method: 'POST'
          },
          {
            // Keep navigation responsive when offline.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-shell',
              networkTimeoutSeconds: 4
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '127.0.0.1',
    port: 5173
  }
});
