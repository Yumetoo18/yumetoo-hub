// ============================================================
// YumeHub — Service Worker (cache-first + réseau en fallback)
// ============================================================

const CACHE_NAME = 'yumehub-v1';

// Fichiers essentiels à mettre en cache à l'installation
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// --- Installation : pré-cache des fichiers essentiels ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// --- Activation : nettoyage des anciens caches ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// --- Stratégie : réseau d'abord pour les données JSON, cache-first pour le reste ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pour les fichiers JSON de données : réseau d'abord, cache en fallback
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Mettre en cache la réponse fraîche
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // En cas d'erreur réseau, retourner le cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Pour tout le reste : cache d'abord, réseau en fallback
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Mettre en cache les nouvelles ressources
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
  );
});
