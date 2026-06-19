// QR Inventory System - Service Worker
// Version 1.0.0
// This service worker provides offline support and caching for the PWA

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `qr-inventory-${CACHE_VERSION}`;

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Runtime cache names
const RUNTIME_CACHE = 'qr-inventory-runtime';
const IMAGE_CACHE = 'qr-inventory-images';
const API_CACHE = 'qr-inventory-api';

// Cache expiration times (in milliseconds)
const CACHE_EXPIRATION = {
  images: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 5 * 60 * 1000,                 // 5 minutes
  runtime: 24 * 60 * 60 * 1000        // 24 hours
};

// Maximum cache sizes
const MAX_CACHE_SIZE = {
  images: 50,    // 50 images
  api: 100,      // 100 API responses
  runtime: 100   // 100 runtime files
};

// ============================================================================
// INSTALL EVENT - Cache essential assets
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT - Clean up old caches
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old versions of our cache
              return cacheName.startsWith('qr-inventory-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated successfully');
        return self.clients.claim(); // Take control of all pages
      })
  );
});

// ============================================================================
// FETCH EVENT - Intercept network requests
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that we don't control
  if (url.origin !== location.origin && !url.origin.includes('localhost')) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (request.method !== 'GET') {
    // Don't cache non-GET requests (POST, PUT, DELETE, etc.)
    return;
  }

  // API requests - Network First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Images - Cache First
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  // App shell and static assets - Stale While Revalidate
  event.respondWith(staleWhileRevalidateStrategy(request, RUNTIME_CACHE));
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Cache First Strategy - Try cache first, fallback to network
 * Good for: Images, fonts, static assets that rarely change
 */
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Return cached response and update cache in background
      updateCacheInBackground(request, cache);
      return cachedResponse;
    }

    // Not in cache, fetch from network
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      await limitCacheSize(cacheName, MAX_CACHE_SIZE.images);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache First strategy failed:', error);
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Network First Strategy - Try network first, fallback to cache
 * Good for: API requests, dynamic content
 */
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      await limitCacheSize(cacheName, MAX_CACHE_SIZE.api);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('[SW] Serving from cache (offline):', request.url);
      return cachedResponse;
    }

    // No cache available, return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are currently offline. Please check your connection.'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Stale While Revalidate Strategy - Return cache immediately, update in background
 * Good for: App shell, JavaScript, CSS that can be slightly stale
 */
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      limitCacheSize(cacheName, MAX_CACHE_SIZE.runtime);
    }
    return networkResponse;
  });

  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update cache in background without blocking response
 */
function updateCacheInBackground(request, cache) {
  fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response);
      }
    })
    .catch((error) => {
      console.log('[SW] Background cache update failed:', error);
    });
}

/**
 * Check if request is for an image
 */
function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(request.url);
}

/**
 * Limit cache size by removing oldest entries
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    // Remove oldest entries
    const entriesToDelete = keys.length - maxSize;
    for (let i = 0; i < entriesToDelete; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${entriesToDelete} entries from ${cacheName}`);
  }
}

/**
 * Delete expired cache entries
 */
async function deleteExpiredCaches(cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const now = Date.now();

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const dateHeader = response.headers.get('date');
      if (dateHeader) {
        const cacheTime = new Date(dateHeader).getTime();
        if (now - cacheTime > maxAge) {
          await cache.delete(request);
          console.log('[SW] Deleted expired cache entry:', request.url);
        }
      }
    }
  }
}

// ============================================================================
// MESSAGE EVENT - Handle messages from clients
// ============================================================================
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith('qr-inventory-')) {
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => {
        console.log('[SW] All caches cleared');
        // Notify client
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = event.data.urls;
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(urls);
      }).then(() => {
        console.log('[SW] URLs cached:', urls);
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// ============================================================================
// BACKGROUND SYNC - For offline actions (future enhancement)
// ============================================================================
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // Placeholder for syncing offline transactions
  // This would fetch from IndexedDB and send to server
  console.log('[SW] Syncing offline transactions...');
}

// ============================================================================
// PUSH NOTIFICATIONS - For notifications (future enhancement)
// ============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      vibrate: [200, 100, 200],
      data: data,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'QR Inventory', options)
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// ============================================================================
// PERIODIC CLEANUP
// ============================================================================
// Clean up expired caches periodically
setInterval(() => {
  deleteExpiredCaches(IMAGE_CACHE, CACHE_EXPIRATION.images);
  deleteExpiredCaches(API_CACHE, CACHE_EXPIRATION.api);
  deleteExpiredCaches(RUNTIME_CACHE, CACHE_EXPIRATION.runtime);
}, 60 * 60 * 1000); // Run every hour

// ============================================================================
// ERROR HANDLING
// ============================================================================
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

// Log that service worker is ready
console.log('[SW] Service worker script loaded');