// sw.js — Service Worker para Busca Ativa Escolar
const CACHE_NAME = 'busca-ativa-v1';
const ASSETS = [
  '/busca-ativa.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Instalação: pré-cache dos assets principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Falha ao cachear alguns assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first para Firebase, Cache-first para assets estáticos
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requisições externas (Firebase, APIs)
  if (!url.origin.includes(self.location.origin)) return;

  // Ignora métodos não-GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        // Clona e salva no cache se for resposta válida
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached); // Offline: usa cache

      // Retorna cache imediatamente se existir, atualiza em background
      return cached || networkFetch;
    })
  );
});
