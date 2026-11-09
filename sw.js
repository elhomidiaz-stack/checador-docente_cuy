
const CACHE_VERSION = "checador-cuy-v2";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json"
];

// INSTALACIÓN: guardar archivos básicos.
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN: eliminar versiones anteriores.
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(claves => Promise.all(
        claves
          .filter(clave => clave !== CACHE_VERSION)
          .map(clave => caches.delete(clave))
      ))
      .then(() => self.clients.claim())
  );
});

// NAVEGACIÓN Y ARCHIVOS LOCALES.
self.addEventListener("fetch", event => {
  const solicitud = event.request;

  if (solicitud.method !== "GET") return;

  const url = new URL(solicitud.url);

  // No interceptar servicios externos, como Firebase.
  if (url.origin !== self.location.origin) return;

  // Para la navegación, intentar red y después caché.
  if (solicitud.mode === "navigate") {
    event.respondWith(
      fetch(solicitud)
        .then(respuesta => {
          if (respuesta.ok) {
            const copia = respuesta.clone();

            caches.open(CACHE_VERSION)
              .then(cache => cache.put("./index.html", copia));
          }

          return respuesta;
        })
        .catch(async () => {
          const guardado = await caches.match("./index.html");

          if (guardado) return guardado;

          return new Response(
            "El checador no está disponible sin conexión.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          );
        })
    );

    return;
  }

  // Para los archivos locales, usar caché y actualizar desde red.
  event.respondWith(
    caches.match(solicitud).then(async guardado => {
      const solicitudRed = fetch(solicitud)
        .then(respuesta => {
          if (respuesta.ok) {
            const copia = respuesta.clone();

            caches.open(CACHE_VERSION)
              .then(cache => cache.put(solicitud, copia));
          }

          return respuesta;
        });

      if (guardado) {
        event.waitUntil(solicitudRed.catch(() => {}));
        return guardado;
      }

      try {
        return await solicitudRed;
      } catch (error) {
        return new Response("Sin conexión", {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    })
  );
});
