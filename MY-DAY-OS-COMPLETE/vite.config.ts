import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(command === 'build'
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: [
                'icon.svg',
                'apple-touch-icon.png',
                'pwa-192x192.png',
                'pwa-512x512.png',
                'RAA_DIARY_USE_KARVANI_RIT_GUJARATI.txt',
                'RAA_DIARY_FEATURES_GUIDE_GUJARATI.txt',
              ],
              manifest: {
                id: '/',
                name: "Raa's Diary — Personal Life OS",
                short_name: "Raa's Diary",
                description:
                  "Raa's Diary: Smart Alarms, Time-Stamped Daily Diary, Master Brain, Routines, Tasks, Calendar & AI.",
                theme_color: '#0b0e16',
                background_color: '#0b0e16',
                display: 'standalone',
                display_override: ['window-controls-overlay', 'standalone'],
                orientation: 'any',
                categories: ['productivity', 'lifestyle', 'utilities'],
                start_url: '/',
                scope: '/',
                shortcuts: [
                  {
                    name: 'Quick Add Task',
                    short_name: 'Tasks',
                    description: "Open today's tasks in Raa's Diary",
                    url: '/?module=tasks',
                    icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
                  },
                  {
                    name: 'Water Tracker',
                    short_name: 'Water',
                    description: 'Log water intake quickly',
                    url: '/?module=trackers',
                    icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
                  },
                  {
                    name: 'AURAA AI & Master Brain',
                    short_name: 'AURAA AI',
                    description: 'Ask AURAA AI in Gujarati, Hindi or English',
                    url: '/?module=ai',
                    icons: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
                  },
                ],
                icons: [
                  {
                    src: '/pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any',
                  },
                  {
                    src: '/pwa-maskable-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable',
                  },
                ],
              },
              workbox: {
                globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
                globIgnores: ['**/index.html'],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                navigateFallback: null,
                navigateFallbackDenylist: [/^\/api\//],
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts-cache',
                      expiration: {
                        maxEntries: 12,
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                      cacheableResponse: { statuses: [0, 200] },
                    },
                  },
                  {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'gstatic-fonts-cache',
                      expiration: {
                        maxEntries: 16,
                        maxAgeSeconds: 60 * 60 * 24 * 365,
                      },
                      cacheableResponse: { statuses: [0, 200] },
                    },
                  },
                ],
              },
              devOptions: {
                enabled: false,
              },
            }),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      target: ['es2020', 'safari15'],
      cssTarget: 'safari15',
    },
    server: {
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
