/*
 * Konsumpcja — Service Worker
 * - zapisuje aplikację w pamięci telefonu, żeby działała bez internetu,
 * - zawsze najpierw próbuje pobrać świeży index.html (nowe wersje pojawiają się same).
 * Przy zmianie ikon lub manifestu podbij numer w VERSION.
 */
const VERSION = 'konsumpcja-1.0.1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(req.url, { signal: controller.signal, cache: 'no-store', credentials: 'same-origin' });
          clearTimeout(timer);
          if (res.ok) {
            const cache = await caches.open(VERSION);
            cache.put('./index.html', res.clone());
          }
          return res;
        } catch {
          return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
        }
      })()
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
