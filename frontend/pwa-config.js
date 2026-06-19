/**
 * pwa-config.js
 * devOptions.enabled = false — SW must not run in dev (intercepts API calls).
 * All icon references use canonical names (no -v1 suffix).
 */

export const pwaConfig = {
  registerType: 'autoUpdate',
  includeAssets: [
    'logo.jpg',
    'icons/*.png'
  ],

  manifest: {
    name: 'QR Inventory System - Scouts Musulmans de Montréal',
    short_name: 'QR Inventory',
    description: 'QR Code-based Inventory Management System for tracking and managing equipment, tools, and supplies',
    theme_color: '#1b4332',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait-primary',
    scope: '/',
    start_url: '/',
    lang: 'fr-CA',
    dir: 'ltr',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      { src: '/icons/icon-72.png',  sizes: '72x72',   type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-96.png',  sizes: '96x96',   type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: [
      {
        name: 'Scanner QR',
        short_name: 'Scanner',
        description: 'Scanner un code QR pour emprunter ou retourner',
        url: '/scanner',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Inventaire',
        short_name: 'Inventaire',
        description: "Parcourir l'inventaire disponible",
        url: '/inventory',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      },
      {
        name: 'Mon Profil',
        short_name: 'Profil',
        description: 'Voir votre profil et emprunts actifs',
        url: '/profile',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
      }
    ],
    screenshots: [],
    prefer_related_applications: false,
    related_applications: []
  },

  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2,ttf,eot}'],
    globIgnores: ['**/node_modules/**/*', '**/sw.js', '**/workbox-*.js'],
    runtimeCaching: [
      {
        urlPattern: /^https?:\/\/.*\/api\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [0, 200] },
          networkTimeoutSeconds: 10
        }
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: { maxEntries: 60, maxAgeSeconds: 2592000 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'font-cache',
          expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
          cacheableResponse: { statuses: [0, 200] }
        }
      },
      {
        urlPattern: /\.(?:css|js)$/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
          expiration: { maxEntries: 60, maxAgeSeconds: 604800 },
          cacheableResponse: { statuses: [0, 200] }
        }
      }
    ],
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true
  },

  // IMPORTANT: disabled in dev — SW intercepts API calls → "Failed to fetch"
  devOptions: {
    enabled: false,
    type: 'module',
    navigateFallback: 'index.html'
  }
};

export default pwaConfig;