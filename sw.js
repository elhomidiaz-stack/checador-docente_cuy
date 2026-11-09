
const CACHE_VERSION = "checador-cuy-v4";
const CACHE_FIREBASE = "checador-firebase-v1";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json"
];

const FIREBASE_HOST = "www.gstatic.com";
const FIREBASE_VERSION = "/firebasejs/13.2.0/";

/* INSTALACIÓN */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVACIÓN Y LIMPIEZA */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key !== CACHE_VERSION &&
            key !== CACHE_FIREBASE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* SOLICITUDES */

self.addEventListener("fetch", event => {
  const solicitud = event.request;

  if (solicitud.method !== "GET") return;

  const url = new URL(solicitud.url);

  /* FIREBASE */

  if (
    url.hostname === FIREBASE_HOST &&
    url.pathname.includes(FIREBASE_VERSION)
  ) {
    event.respondWith(
      caches.open(CACHE_FIREBASE)
        .then(async cache => {
          const guardado = await cache.match(solicitud);

          if (guardado) return guardado;

          const respuesta = await fetch(solicitud);

          if (respuesta.ok) {
            await cache.put(solicitud, respuesta.clone());
          }

          return respuesta;
        })
        .catch(() => new Response(
          "Módulo de Firebase no disponible.",
          { status: 503 }
        ))
    );

    return;
  }

  /* SOLO ARCHIVOS DEL MISMO SITIO */

  if (url.origin !== self.location.origin) return;

  /* NAVEGACIÓN */

  if (solicitud.mode === "navigate") {
    const esPaginaPrincipal =
      url.pathname.endsWith("/") ||
      url.pathname.endsWith("/index.html");

    event.respondWith(
      fetch(solicitud)
        .then(async respuesta => {
          if (respuesta.ok && esPaginaPrincipal) {
            const cache = await caches.open(CACHE_VERSION);
            await cache.put("./index.html", respuesta.clone());
          }

          return respuesta;
        })
        .catch(async () => {
          if (esPaginaPrincipal) {
            const cache = await caches.open(CACHE_VERSION);
            const guardado = await cache.match("./index.html");

            if (guardado) return guardado;
          }

          return new Response(
            "Página no disponible. Comprueba tu conexión.",
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

  /* RECURSOS LOCALES */

  event.respondWith(
    caches.open(CACHE_VERSION)
      .then(async cache => {
        const guardado = await cache.match(solicitud);

        const solicitudRed = fetch(solicitud)
          .then(async respuesta => {
            if (respuesta.ok) {
              await cache.put(solicitud, respuesta.clone());
            }

            return respuesta;
          });

        if (guardado) {
          event.waitUntil(solicitudRed.catch(() => {}));
          return guardado;
        }

        return solicitudRed;
      })
      .catch(() => new Response(
        "Recurso no disponible sin conexión.",
        { status: 503 }
      ))
  );
});
