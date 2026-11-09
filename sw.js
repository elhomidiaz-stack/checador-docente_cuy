
const CACHE_VERSION = "checador-cuy-v3";
const CACHE_FIREBASE = "checador-firebase-v1";

const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json"
];

const FIREBASE_HOST = "www.gstatic.com";
const FIREBASE_VERSION = "/firebasejs/13.2.0/";


/*******************************************************
 * INSTALACIÓN
 *******************************************************/

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});


/*******************************************************
 * ACTIVACIÓN Y LIMPIEZA
 *******************************************************/

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


/*******************************************************
 * SOLICITUDES DE RED
 *******************************************************/

self.addEventListener("fetch", event => {
  const solicitud = event.request;

  if (solicitud.method !== "GET") {
    return;
  }

  const url = new URL(solicitud.url);


  /*****************************************************
   * MÓDULOS FIREBASE
   *****************************************************/

  if (
    url.hostname === FIREBASE_HOST &&
    url.pathname.includes(FIREBASE_VERSION)
  ) {
    event.respondWith(
      caches.open(CACHE_FIREBASE)
        .then(async cache => {
          const guardado = await cache.match(solicitud);

          if (guardado) {
            return guardado;
          }

          const respuesta = await fetch(solicitud);

          if (respuesta.ok) {
            await cache.put(
              solicitud,
              respuesta.clone()
            );
          }

          return respuesta;
        })
        .catch(() =>
          new Response(
            "No se encuentra disponible el módulo de Firebase sin conexión.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8"
              }
            }
          )
        )
    );

    return;
  }


  /*****************************************************
   * ARCHIVOS DE LA APLICACIÓN
   *****************************************************/

  if (url.origin !== self.location.origin) {
    return;
  }


  /*****************************************************
   * PÁGINA PRINCIPAL
   *****************************************************/

  if (solicitud.mode === "navigate") {
    event.respondWith(
      fetch(solicitud)
        .then(respuesta => {
          if (respuesta.ok) {
            const copia = respuesta.clone();

            caches.open(CACHE_VERSION)
              .then(cache =>
                cache.put("./index.html", copia)
              );
          }

          return respuesta;
        })
        .catch(async () => {
          const guardado = await caches.match("./index.html");

          if (guardado) {
            return guardado;
          }

          return new Response(
            "El checador no está disponible.",
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


  /*****************************************************
   * RECURSOS LOCALES
   *****************************************************/

  event.respondWith(
    caches.match(solicitud)
      .then(async guardado => {
        const solicitudRed = fetch(solicitud)
          .then(respuesta => {
            if (respuesta.ok) {
              const copia = respuesta.clone();

              caches.open(CACHE_VERSION)
                .then(cache =>
                  cache.put(solicitud, copia)
                );
            }

            return respuesta;
          });

        if (guardado) {
          event.waitUntil(
            solicitudRed.catch(() => {})
          );

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
