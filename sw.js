'use strict';

const CACHE_NAME = 'evoquest-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css?v=6',
  './js/storage.js?v=6',
  './js/game/xp.js?v=6',
  './js/game/categories.js?v=6',
  './js/game/quests.js?v=6',
  './js/game/achievements.js?v=6',
  './js/game/shop.js?v=6',
  './js/game/regras.js?v=6',
  './js/state.js?v=6',
  './js/ui/icons.js?v=6',
  './js/ui/notifications.js?v=6',
  './js/ui/progress-card.js?v=6',
  './js/ui/modals.js?v=6',
  './js/ui/screens.js?v=6',
  './js/ui/help.js?v=6',
  './js/app.js?v=6',
  './js/pwa.js?v=6',
  './img/logo/logo.jpeg',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png',
  './img/icons/icon-192-maskable.png',
  './img/icons/icon-512-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // Navigation request: network first, fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Static assets: cache first, then network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
