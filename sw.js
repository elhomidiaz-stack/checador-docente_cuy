
const CACHE = 'checador-cuy-offline-v1';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ARCHIVOS)
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(claves =>
      Promise.all(
        claves
          .filter(clave => clave !== CACHE)
          .map(clave => caches.delete(clave))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const solicitud = event.request;

  if (
    solicitud.mode === 'navigate' &&
    new URL(solicitud.url).origin ===
      self.location.origin
  ) {
    event.respondWith(
      fetch(solicitud).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          await cache.match('./index.html')
        ) || Response.error();
      })
    );
  }
});
