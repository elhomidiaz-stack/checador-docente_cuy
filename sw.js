
const CACHE = 'checador-docente-v1';

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.json'
];

// INSTALAR Y GUARDAR ARCHIVOS
self.addEventListener('install', event => {

  event.waitUntil(

    caches.open(CACHE).then(cache => {

      return cache.addAll(ARCHIVOS);

    })

  );

  self.skipWaiting();

});


// ACTIVAR APLICACIÓN
self.addEventListener('activate', event => {

  event.waitUntil(

    caches.keys().then(keys =>

      Promise.all(

        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))

      )

    )

  );

  self.clients.claim();

});


// FUNCIONAMIENTO SIN INTERNET
self.addEventListener('fetch', event => {

  if (event.request.method !== 'GET') return;

  event.respondWith(

    fetch(event.request)

      .then(response => {

        if (
          response.ok &&
          new URL(event.request.url).origin === self.location.origin
        ) {

          const copia = response.clone();

          caches.open(CACHE).then(cache => {

            cache.put(event.request, copia);

          });

        }

        return response;

      })

      .catch(async () => {

        const guardado = await caches.match(event.request);

        if (guardado) return guardado;

        if (event.request.mode === 'navigate') {

          return caches.match('./index.html');

        }

        return new Response('Sin conexión', {
          status: 503
        });

      })

  );

});
