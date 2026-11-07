/* =====================================================================
   sw.js — «Service worker»: permite usar la app sin internet
   ---------------------------------------------------------------------
   Estrategia «primero la red»: si hay conexión, se usa siempre la
   versión más nueva (así ves enseguida las mejoras que hagas) y se
   guarda una copia. Si no hay conexión, se usa la copia guardada.
   ===================================================================== */

const NOMBRE_CACHE = 'mi-dia-movil-v1';

const ARCHIVOS_DE_LA_APP = [
  './',
  './index.html',
  './estilos.css',
  './manifest.webmanifest',
  './iconos/icono.svg',
  './iconos/icono-180.png',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
  './scripts/utilidades.js',
  './scripts/almacenamiento.js',
  './scripts/sonidos.js',
  './scripts/confeti.js',
  './scripts/hojas.js',
  './scripts/rocas.js',
  './scripts/pomodoro.js',
  './scripts/tareas.js',
  './scripts/horario.js',
  './scripts/app.js',
];

// Al instalarse, guarda una copia de todos los archivos
self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(NOMBRE_CACHE).then(cache => cache.addAll(ARCHIVOS_DE_LA_APP)));
  self.skipWaiting();
});

// Al activarse, borra copias de versiones antiguas
self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys().then(nombres => Promise.all(
      nombres.filter(nombre => nombre !== NOMBRE_CACHE).map(nombre => caches.delete(nombre))
    ))
  );
  self.clients.claim();
});

// Cada vez que la app pide un archivo
self.addEventListener('fetch', evento => {
  if (evento.request.method !== 'GET') return;
  if (new URL(evento.request.url).origin !== self.location.origin) return;

  evento.respondWith(
    fetch(evento.request)
      .then(respuesta => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(NOMBRE_CACHE).then(cache => cache.put(evento.request, copia));
        }
        return respuesta;
      })
      .catch(() => caches.match(evento.request, { ignoreSearch: true })
        .then(guardada => guardada || caches.match('./index.html')))
  );
});
