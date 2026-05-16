/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  return ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  server: {
    port: 4200,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4300,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    nxViteTsPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo1.png', 'logo2.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'JuggleFlow',
        short_name: 'JuggleFlow',
        description: 'Plateforme pédagogique pour apprendre le jonglage',
        lang: 'fr',
        dir: 'ltr',
        theme_color: '#0A0E2A',
        background_color: '#0A0E2A',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['education', 'sports'],
        icons: [
          {
            src: 'logo1.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo1.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'logo2.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Catalogue',
            short_name: 'Catalogue',
            description: 'Parcourir les figures de jonglage',
            url: '/student/catalogue',
            icons: [{ src: 'logo1.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Progression',
            short_name: 'Progression',
            description: 'Voir ta progression',
            url: '/student/progression',
            icons: [{ src: 'logo1.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Accueil',
            short_name: 'Accueil',
            description: 'Tableau de bord élève',
            url: '/student/dashboard',
            icons: [{ src: 'logo1.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Sécurité: ne jamais mettre en cache les endpoints d'auth.
            // (cookies + tokens + risque d'effets de bord)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/auth'),
            handler: 'NetworkOnly',
          },
          {
            // Données "catalogue" (non sensibles): tolère offline/latence.
            // Ajuster au besoin si certains endpoints exposent des données perso.
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/api/tricks') ||
                url.pathname.startsWith('/api/badges') ||
                url.pathname.startsWith('/api/learning-paths')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-public-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24h
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Données utilisateur: ne pas servir depuis le cache.
            // (progression, classes, exports RGPD/CSV…)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: {
        // En dev, Vite sert les fichiers en mémoire: la génération Workbox n'a
        // souvent rien à "precache" dans `dev-dist` (à part sw/workbox ignorés),
        // ce qui déclenche un warning inutile.
        enabled: !isDev,
        type: 'module',
      },
    }),
  ],
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  test: {
    name: '@juggleflow/frontend',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
});
});