// Service worker minimal — Lojeo storefront PWA
// Estratégia: network-first com fallback offline para shell. Não cachea checkout/api.

const CACHE_NAME = 'lojeo-shell-v1';
const SHELL_URLS = [
  '/',
  '/produtos',
  '/sobre',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não interceptar API calls, checkout, conta, ou métodos diferentes de GET
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/checkout')) return;
  if (url.pathname.startsWith('/conta')) return;
  if (url.pathname.startsWith('/_next/data/')) return;

  // Network-first com fallback ao cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).catch(() => null));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/')))
  );
});

// ── Push notifications (Sprint 13 stub) ────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'Joias Atelier', body: 'Você tem uma novidade.', url: '/' };
  if (event.data) {
    try { data = Object.assign(data, event.data.json()); } catch (_) { /* fallback */ }
  }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    data: { url: data.url || '/' },
    tag: data.tag,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
